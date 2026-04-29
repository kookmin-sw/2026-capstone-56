const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { randomUUID, randomBytes } = require('crypto')
const { PrismaClient } = require('@prisma/client')
const rateLimit = require('express-rate-limit')
const authMiddleware = require('../middleware/auth')
const { sendVerificationEmail, sendPasswordResetEmail } = require('../services/mailer')
const { matchesWhitelist } = require('./whitelist')

const router = express.Router()
const prisma = new PrismaClient()

// Rate limiters
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: '로그인 시도가 너무 많습니다. 15분 후 다시 시도해주세요.' },
  standardHeaders: true, legacyHeaders: false,
})
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { message: '회원가입 시도가 너무 많습니다. 1시간 후 다시 시도해주세요.' },
  standardHeaders: true, legacyHeaders: false,
})
const passwordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { message: '요청이 너무 많습니다. 1시간 후 다시 시도해주세요.' },
  standardHeaders: true, legacyHeaders: false,
})

// 학교 이메일 도메인 검증 (substring 우회 방지)
function isSchoolEmail(email) {
  const domain = email.split('@')[1]
  if (!domain) return false
  const parts = domain.split('.')
  for (let i = 0; i < parts.length - 1; i++) {
    if (parts[i] === 'ac' && parts[i + 1] === 'kr') return true
  }
  if (parts[parts.length - 1] === 'edu') return true
  return false
}

// POST /api/auth/register — 회원가입
router.post('/register', registerLimiter, async (req, res, next) => {
  try {
    const { name, email, password, studentId } = req.body
    if (!name || !email || !password) {
      return res.status(400).json({ message: '모든 필드를 입력해주세요.' })
    }

    if (!isSchoolEmail(email)) {
      return res.status(400).json({ message: '학교 이메일(.ac.kr 또는 .edu)만 가입할 수 있습니다.' })
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) return res.status(409).json({ message: '이미 사용 중인 이메일입니다.' })

    if (studentId) {
      const existingStudent = await prisma.user.findUnique({ where: { studentId } })
      if (existingStudent) return res.status(409).json({ message: '이미 등록된 학번입니다.' })
    }

    // 이메일 도메인으로 학교 자동 매칭
    const domain = email.split('@')[1]
    const school = await prisma.school.findUnique({ where: { domain } })

    // 화이트리스트 검증
    if (school) {
      const whitelist = await prisma.whitelist.findUnique({
        where: { schoolId: school.id },
        include: { entries: true },
      })
      if (!whitelist || whitelist.entries.length === 0) {
        return res.status(403).json({ message: '해당 학교는 아직 가입이 허용되지 않았습니다.' })
      }
      if (!matchesWhitelist(email, whitelist.entries)) {
        return res.status(403).json({ message: '해당 학교의 가입 가능 이메일이 아닙니다.' })
      }
    }

    const hashed = await bcrypt.hash(password, 10)
    const verifyToken = randomUUID()
    const user = await prisma.user.create({
      data: {
        name, email, password: hashed,
        studentId: studentId || null,
        schoolId: school?.id || null,
        verifyToken
      },
      select: { id: true, name: true, email: true, role: true, studentId: true, schoolId: true, school: { select: { name: true } } }
    })

    const verifyUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verifyToken}`
    sendVerificationEmail({ to: email, name, verifyUrl }).catch(console.error)

    res.status(201).json({ ...user, message: '가입 완료! 이메일의 인증 링크를 클릭해주세요.' })
  } catch (err) { next(err) }
})

// GET /api/auth/verify-email?token=xxx — 이메일 인증
router.get('/verify-email', async (req, res, next) => {
  try {
    const { token } = req.query
    if (!token) return res.status(400).json({ message: '유효하지 않은 링크입니다.' })

    const user = await prisma.user.findUnique({ where: { verifyToken: token } })
    if (!user) return res.status(400).json({ message: '유효하지 않거나 만료된 링크입니다.' })

    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: true, verifyToken: null }
    })
    res.json({ message: '이메일 인증이 완료되었습니다.' })
  } catch (err) { next(err) }
})

// POST /api/auth/resend-verification — 인증 메일 재발송
router.post('/resend-verification', authMiddleware, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } })
    if (user.emailVerified) return res.status(400).json({ message: '이미 인증된 이메일입니다.' })

    const verifyToken = randomUUID()
    await prisma.user.update({ where: { id: user.id }, data: { verifyToken, emailVerified: false } })

    const verifyUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verifyToken}`
    await sendVerificationEmail({ to: user.email, name: user.name, verifyUrl })
    res.json({ message: '인증 메일을 재발송했습니다.' })
  } catch (err) { next(err) }
})

// POST /api/auth/login — 로그인
router.post('/login', loginLimiter, async (req, res, next) => {
  try {
    const { email, password } = req.body
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: '이메일 또는 비밀번호가 올바르지 않습니다.' })
    }
    const schoolData = user.schoolId
      ? await prisma.school.findUnique({ where: { id: user.schoolId }, select: { id: true, name: true, domain: true } })
      : null
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, emailVerified: user.emailVerified, schoolId: user.schoolId },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    )
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, emailVerified: user.emailVerified, schoolId: user.schoolId, school: schoolData } })
  } catch (err) { next(err) }
})

// GET /api/auth/me — 내 정보 조회
router.get('/me', authMiddleware, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true, name: true, email: true, role: true, emailVerified: true,
        schoolId: true, school: { select: { id: true, name: true, domain: true } }
      }
    })
    res.json(user)
  } catch (err) { next(err) }
})

// GET /api/auth/check-student-id?studentId=xxx — 학번 중복 확인
router.get('/check-student-id', authMiddleware, async (req, res, next) => {
  try {
    const { studentId } = req.query
    if (!studentId) return res.json({ available: true })
    const existing = await prisma.user.findUnique({ where: { studentId } })
    const available = !existing || existing.id === req.user.id
    res.json({ available })
  } catch (err) { next(err) }
})

// PUT /api/auth/me — 개인정보 수정
router.put('/me', authMiddleware, async (req, res, next) => {
  try {
    const { name, email, studentId, currentPassword, newPassword } = req.body
    const user = await prisma.user.findUnique({ where: { id: req.user.id } })

    if (email && email !== user.email) {
      const existing = await prisma.user.findUnique({ where: { email } })
      if (existing) return res.status(409).json({ message: '이미 사용 중인 이메일입니다.' })
    }

    if (studentId && studentId !== user.studentId) {
      const existing = await prisma.user.findUnique({ where: { studentId } })
      if (existing) return res.status(409).json({ message: '이미 등록된 학번입니다.' })
    }

    let hashedPassword
    if (newPassword) {
      if (!currentPassword) return res.status(400).json({ message: '현재 비밀번호를 입력하세요.' })
      const valid = await bcrypt.compare(currentPassword, user.password)
      if (!valid) return res.status(401).json({ message: '현재 비밀번호가 올바르지 않습니다.' })
      hashedPassword = await bcrypt.hash(newPassword, 10)
    }

    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        name: name || undefined,
        email: email || undefined,
        studentId: studentId !== undefined ? (studentId || null) : undefined,
        password: hashedPassword || undefined
      },
      select: { id: true, name: true, email: true, role: true, studentId: true }
    })
    res.json(updated)
  } catch (err) { next(err) }
})

// POST /api/auth/forgot-password — 비밀번호 재설정 메일 발송
router.post('/forgot-password', passwordLimiter, async (req, res, next) => {
  try {
    const { email } = req.body
    if (!email) return res.status(400).json({ message: '이메일을 입력하세요.' })

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) return res.json({ message: '입력한 이메일로 재설정 링크를 발송했습니다.' })

    const resetToken = randomBytes(32).toString('hex')
    const resetExpiry = new Date(Date.now() + 60 * 60 * 1000)

    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken, resetTokenExpiry: resetExpiry },
    })

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`
    sendPasswordResetEmail({ to: user.email, name: user.name, resetUrl }).catch(console.error)

    res.json({ message: '입력한 이메일로 재설정 링크를 발송했습니다.' })
  } catch (err) { next(err) }
})

// POST /api/auth/reset-password — 새 비밀번호 저장
router.post('/reset-password', passwordLimiter, async (req, res, next) => {
  try {
    const { token, password } = req.body
    if (!token || !password) return res.status(400).json({ message: '토큰과 새 비밀번호를 입력하세요.' })
    if (password.length < 6) return res.status(400).json({ message: '비밀번호는 6자 이상이어야 합니다.' })

    const user = await prisma.user.findUnique({ where: { resetToken: token } })
    if (!user) return res.status(400).json({ message: '유효하지 않은 링크입니다.' })
    if (!user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
      return res.status(400).json({ message: '만료된 링크입니다. 다시 요청해주세요.' })
    }

    const hashed = await bcrypt.hash(password, 10)
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashed, resetToken: null, resetTokenExpiry: null },
    })

    res.json({ message: '비밀번호가 변경되었습니다. 새 비밀번호로 로그인하세요.' })
  } catch (err) { next(err) }
})

// DELETE /api/auth/me — 회원탈퇴
router.delete('/me', authMiddleware, async (req, res, next) => {
  try {
    const userId = req.user.id
    await prisma.user.delete({ where: { id: userId } })
    res.json({ message: '탈퇴가 완료되었습니다.' })
  } catch (err) { next(err) }
})

module.exports = router

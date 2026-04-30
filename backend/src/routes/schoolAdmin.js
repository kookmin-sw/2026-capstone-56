const express = require('express')
const { PrismaClient } = require('@prisma/client')
const authMiddleware = require('../middleware/auth')
const { requireRole } = require('../middleware/auth')

const router = express.Router()
const prisma = new PrismaClient()

const SCHOOL_ADMIN = requireRole('SCHOOL_ADMIN')
const ALLOWED_ROLES = ['ATTENDEE', 'CERTIFIED']

// GET /api/school-admin/users — 내 학교 유저 목록
router.get('/users', authMiddleware, SCHOOL_ADMIN, async (req, res, next) => {
  try {
    const schoolId = req.user.schoolId
    if (!schoolId) return res.status(403).json({ message: '소속 학교가 없습니다.' })

    const { search } = req.query

    const [school, users] = await Promise.all([
      prisma.school.findFirst({ where: { id: schoolId, deletedAt: null } }),
      prisma.user.findMany({
        where: {
          schoolId,
          deletedAt: null,
          ...(search ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ]
          } : {})
        },
        select: {
          id: true, name: true, email: true, role: true,
          emailVerified: true, studentId: true, createdAt: true,
        },
        orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
      })
    ])

    if (!school) return res.status(404).json({ message: '학교를 찾을 수 없습니다.' })

    res.json({ school, users })
  } catch (err) { next(err) }
})

// PUT /api/school-admin/users/:userId/role — 역할 변경 (ATTENDEE/CERTIFIED 범위)
router.put('/users/:userId/role', authMiddleware, SCHOOL_ADMIN, async (req, res, next) => {
  try {
    const schoolId = req.user.schoolId
    if (!schoolId) return res.status(403).json({ message: '소속 학교가 없습니다.' })

    const { role } = req.body
    if (!ALLOWED_ROLES.includes(role)) {
      return res.status(400).json({ message: '학교 관리자는 일반/인증주최자 역할만 변경할 수 있습니다.' })
    }

    const target = await prisma.user.findFirst({
      where: { id: req.params.userId, deletedAt: null }
    })
    if (!target) return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' })
    if (target.schoolId !== schoolId) return res.status(403).json({ message: '다른 학교의 사용자입니다.' })
    if (!ALLOWED_ROLES.includes(target.role)) {
      return res.status(403).json({ message: '해당 사용자의 역할은 변경할 수 없습니다.' })
    }

    const updated = await prisma.user.update({
      where: { id: req.params.userId },
      data: { role },
      select: { id: true, name: true, email: true, role: true }
    })
    res.json(updated)
  } catch (err) { next(err) }
})

module.exports = router

const express = require('express')
const { PrismaClient } = require('@prisma/client')
const authMiddleware = require('../middleware/auth')
const { requireRole } = require('../middleware/auth')

const router = express.Router()
const prisma = new PrismaClient()

const OPERATOR = requireRole('OPERATOR')

// GET /api/admin/schools/:schoolId/users — 학교 소속 유저 목록
router.get('/schools/:schoolId/users', authMiddleware, OPERATOR, async (req, res, next) => {
  try {
    const { schoolId } = req.params
    const { search } = req.query

    const school = await prisma.school.findFirst({ where: { id: schoolId, deletedAt: null } })
    if (!school) return res.status(404).json({ message: '학교를 찾을 수 없습니다.' })

    const users = await prisma.user.findMany({
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

    res.json({ school, users })
  } catch (err) { next(err) }
})

// PUT /api/admin/users/:userId/role — 역할 변경 (운영자)
router.put('/users/:userId/role', authMiddleware, OPERATOR, async (req, res, next) => {
  try {
    const { role } = req.body
    const VALID_ROLES = ['ATTENDEE', 'CERTIFIED', 'SCHOOL_ADMIN', 'OPERATOR']

    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({ message: '유효하지 않은 역할입니다.' })
    }

    const target = await prisma.user.findFirst({
      where: { id: req.params.userId, deletedAt: null }
    })
    if (!target) return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' })

    // 학교총관리자 임명 시 기존 총관리자 확인 (BR-A06)
    if (role === 'SCHOOL_ADMIN' && target.schoolId) {
      const existing = await prisma.user.findFirst({
        where: { schoolId: target.schoolId, role: 'SCHOOL_ADMIN', deletedAt: null, NOT: { id: target.id } }
      })
      if (existing) {
        return res.status(409).json({
          message: `이미 총관리자(${existing.name})가 있습니다. 먼저 해제해주세요.`
        })
      }
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

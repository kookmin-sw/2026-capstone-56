const express = require('express')
const { PrismaClient } = require('@prisma/client')
const authMiddleware = require('../middleware/auth')
const { requireRole } = require('../middleware/auth')
const audit = require('../utils/audit')

const router = express.Router()
const prisma = new PrismaClient()

const OPERATOR = requireRole('OPERATOR')

// GET /api/schools — 전체 학교 목록
router.get('/', async (req, res, next) => {
  try {
    const schools = await prisma.school.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true, domain: true, address: true, createdAt: true },
      orderBy: { name: 'asc' },
    })
    res.json(schools)
  } catch (err) { next(err) }
})

// GET /api/schools/:id — 학교 상세 조회
router.get('/:id', async (req, res, next) => {
  try {
    const school = await prisma.school.findFirst({
      where: { id: req.params.id, deletedAt: null },
      select: {
        id: true, name: true, domain: true, address: true, createdAt: true,
        _count: { select: { users: true } },
      },
    })
    if (!school) return res.status(404).json({ message: '학교를 찾을 수 없습니다.' })
    res.json(school)
  } catch (err) { next(err) }
})

// POST /api/schools — 학교 등록 (운영자)
router.post('/', authMiddleware, OPERATOR, async (req, res, next) => {
  try {
    const { name, domain, address } = req.body
    if (!name || !domain) return res.status(400).json({ message: '학교명과 이메일 도메인은 필수입니다.' })

    const duplicate = await prisma.school.findFirst({
      where: { deletedAt: null, OR: [{ name }, { domain }] },
    })
    if (duplicate) {
      const field = duplicate.name === name ? '학교명' : '이메일 도메인'
      return res.status(409).json({ message: `이미 등록된 ${field}입니다.` })
    }

    const school = await prisma.school.create({
      data: { name, domain, address: address || null },
      select: { id: true, name: true, domain: true, address: true, createdAt: true },
    })
    audit(req.user.id, 'CREATE_SCHOOL', 'SCHOOL', school.id, school.name)
    res.status(201).json(school)
  } catch (err) { next(err) }
})

// PUT /api/schools/:id — 학교 수정 (운영자)
router.put('/:id', authMiddleware, OPERATOR, async (req, res, next) => {
  try {
    const { name, domain, address } = req.body
    const school = await prisma.school.findFirst({ where: { id: req.params.id, deletedAt: null } })
    if (!school) return res.status(404).json({ message: '학교를 찾을 수 없습니다.' })

    if (name && name !== school.name) {
      const dup = await prisma.school.findFirst({ where: { name, deletedAt: null } })
      if (dup) return res.status(409).json({ message: '이미 등록된 학교명입니다.' })
    }
    if (domain && domain !== school.domain) {
      const dup = await prisma.school.findFirst({ where: { domain, deletedAt: null } })
      if (dup) return res.status(409).json({ message: '이미 등록된 이메일 도메인입니다.' })
    }

    const updated = await prisma.school.update({
      where: { id: req.params.id },
      data: {
        name: name || undefined,
        domain: domain || undefined,
        address: address !== undefined ? address : undefined,
      },
      select: { id: true, name: true, domain: true, address: true, createdAt: true },
    })
    audit(req.user.id, 'UPDATE_SCHOOL', 'SCHOOL', req.params.id, updated.name)
    res.json(updated)
  } catch (err) { next(err) }
})

// DELETE /api/schools/:id — 학교 삭제 (운영자, soft delete)
router.delete('/:id', authMiddleware, OPERATOR, async (req, res, next) => {
  try {
    const school = await prisma.school.findFirst({ where: { id: req.params.id, deletedAt: null } })
    if (!school) return res.status(404).json({ message: '학교를 찾을 수 없습니다.' })

    const userCount = await prisma.user.count({ where: { schoolId: req.params.id, deletedAt: null } })

    // BR-S03: 학교 삭제 시 소속 SCHOOL_ADMIN을 ATTENDEE로 강등
    const demoted = await prisma.user.updateMany({
      where: { schoolId: req.params.id, role: 'SCHOOL_ADMIN', deletedAt: null },
      data: { role: 'ATTENDEE' },
    })

    await prisma.school.update({
      where: { id: req.params.id },
      data: { deletedAt: new Date() },
    })

    audit(req.user.id, 'DELETE_SCHOOL', 'SCHOOL', req.params.id,
      `${school.name} · 소속 ${userCount}명 · 총관리자 ${demoted.count}명 강등`)

    res.json({ message: '학교가 삭제되었습니다.', affectedUsers: userCount, demotedAdmins: demoted.count })
  } catch (err) { next(err) }
})

module.exports = router

const express = require('express')
const { PrismaClient } = require('@prisma/client')
const authMiddleware = require('../middleware/auth')
const { requireRole } = require('../middleware/auth')

const router = express.Router({ mergeParams: true })
const prisma = new PrismaClient()

const OPERATOR = requireRole('OPERATOR')

function isValidEntry(value) {
  if (value.startsWith('@')) return /^@[\w.-]+\.[a-z]{2,}$/.test(value)
  return /^[^\s@]+@[\w.-]+\.[a-z]{2,}$/.test(value)
}

function matchesWhitelist(email, entries) {
  const [, domain] = email.split('@')
  return entries.some(e => e.value === email || e.value === `@${domain}`)
}

// GET /api/schools/:schoolId/whitelist
router.get('/', authMiddleware, OPERATOR, async (req, res, next) => {
  try {
    const whitelist = await prisma.whitelist.findUnique({
      where: { schoolId: req.params.schoolId },
      include: { entries: { orderBy: { createdAt: 'asc' } } },
    })
    res.json(whitelist || null)
  } catch (err) { next(err) }
})

// POST /api/schools/:schoolId/whitelist — 최초 생성
router.post('/', authMiddleware, OPERATOR, async (req, res, next) => {
  try {
    const { schoolId } = req.params
    const existing = await prisma.whitelist.findUnique({ where: { schoolId } })
    if (existing) return res.status(409).json({ message: '이미 화이트리스트가 존재합니다.' })

    const whitelist = await prisma.whitelist.create({
      data: { schoolId },
      include: { entries: true },
    })
    res.status(201).json(whitelist)
  } catch (err) { next(err) }
})

// POST /api/schools/:schoolId/whitelist/entries — 항목 추가
router.post('/entries', authMiddleware, OPERATOR, async (req, res, next) => {
  try {
    const { schoolId } = req.params
    const { value } = req.body

    if (!value || !isValidEntry(value.trim())) {
      return res.status(400).json({ message: '유효하지 않은 형식입니다. (예: @kookmin.ac.kr 또는 user@kookmin.ac.kr)' })
    }

    const whitelist = await prisma.whitelist.findUnique({ where: { schoolId } })
    if (!whitelist) return res.status(404).json({ message: '화이트리스트가 없습니다. 먼저 생성해주세요.' })

    const entry = await prisma.whitelistEntry.create({
      data: { whitelistId: whitelist.id, value: value.trim() },
    })
    res.status(201).json(entry)
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ message: '이미 등록된 항목입니다.' })
    next(err)
  }
})

// PUT /api/schools/:schoolId/whitelist/entries/:entryId — 항목 수정
router.put('/entries/:entryId', authMiddleware, OPERATOR, async (req, res, next) => {
  try {
    const { schoolId, entryId } = req.params
    const { value } = req.body

    if (!value || !isValidEntry(value.trim())) {
      return res.status(400).json({ message: '유효하지 않은 형식입니다.' })
    }

    const whitelist = await prisma.whitelist.findUnique({ where: { schoolId } })
    if (!whitelist) return res.status(404).json({ message: '화이트리스트가 없습니다.' })

    const entry = await prisma.whitelistEntry.findFirst({
      where: { id: entryId, whitelistId: whitelist.id }
    })
    if (!entry) return res.status(404).json({ message: '항목을 찾을 수 없습니다.' })

    const updated = await prisma.whitelistEntry.update({
      where: { id: entryId },
      data: { value: value.trim() },
    })
    res.json(updated)
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ message: '이미 등록된 항목입니다.' })
    next(err)
  }
})

// DELETE /api/schools/:schoolId/whitelist/entries/:entryId — 항목 삭제
router.delete('/entries/:entryId', authMiddleware, OPERATOR, async (req, res, next) => {
  try {
    const { schoolId, entryId } = req.params

    const whitelist = await prisma.whitelist.findUnique({ where: { schoolId } })
    if (!whitelist) return res.status(404).json({ message: '화이트리스트가 없습니다.' })

    const entry = await prisma.whitelistEntry.findFirst({
      where: { id: entryId, whitelistId: whitelist.id }
    })
    if (!entry) return res.status(404).json({ message: '항목을 찾을 수 없습니다.' })

    await prisma.whitelistEntry.delete({ where: { id: entryId } })
    res.json({ message: '삭제되었습니다.' })
  } catch (err) { next(err) }
})

module.exports = router
module.exports.matchesWhitelist = matchesWhitelist

const express = require('express')
const { PrismaClient } = require('@prisma/client')

const router = express.Router()
const prisma = new PrismaClient()

// GET /api/schools — 전체 학교 목록 (이메일 도메인 자동감지용)
router.get('/', async (req, res, next) => {
  try {
    const schools = await prisma.school.findMany({
      select: { id: true, name: true, domain: true },
      orderBy: { name: 'asc' },
    })
    res.json(schools)
  } catch (err) { next(err) }
})

module.exports = router

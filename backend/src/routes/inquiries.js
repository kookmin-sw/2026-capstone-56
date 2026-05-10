const express = require('express')
const { PrismaClient } = require('@prisma/client')
const authMiddleware = require('../middleware/auth')
const { requireRole } = require('../middleware/auth')
const audit = require('../utils/audit')
const { createNotifications } = require('../services/notificationService')

const router = express.Router()
const prisma = new PrismaClient()

const OPERATOR = requireRole('OPERATOR')

// GET /api/inquiries/mine — 내 문의 목록
router.get('/mine', authMiddleware, async (req, res, next) => {
  try {
    const inquiries = await prisma.inquiry.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
    })
    res.json(inquiries)
  } catch (err) { next(err) }
})

// POST /api/inquiries — 문의 작성
router.post('/', authMiddleware, async (req, res, next) => {
  try {
    const { body } = req.body
    if (!body || body.trim().length === 0) {
      return res.status(400).json({ message: '문의 내용을 입력해주세요.' })
    }
    if (body.length > 1000) {
      return res.status(400).json({ message: '문의 내용은 1000자 이내로 입력해주세요.' })
    }

    const inquiry = await prisma.inquiry.create({
      data: { body: body.trim(), userId: req.user.id },
    })
    res.status(201).json(inquiry)
  } catch (err) { next(err) }
})

// DELETE /api/inquiries/:id — 본인 문의 삭제 (미답변만)
router.delete('/:id', authMiddleware, async (req, res, next) => {
  try {
    const inquiry = await prisma.inquiry.findUnique({ where: { id: req.params.id } })
    if (!inquiry) return res.status(404).json({ message: '문의를 찾을 수 없습니다.' })
    if (inquiry.userId !== req.user.id) return res.status(403).json({ message: '권한이 없습니다.' })
    if (inquiry.status === 'ANSWERED') {
      return res.status(400).json({ message: '답변된 문의는 삭제할 수 없습니다.' })
    }

    await prisma.inquiry.delete({ where: { id: req.params.id } })
    res.json({ message: '문의가 삭제되었습니다.' })
  } catch (err) { next(err) }
})

// GET /api/inquiries/admin — 전체 문의 목록 (운영자)
router.get('/admin', authMiddleware, OPERATOR, async (req, res, next) => {
  try {
    const { status } = req.query
    const where = status ? { status } : {}

    const inquiries = await prisma.inquiry.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true, role: true, school: { select: { name: true } } } },
      },
    })
    res.json(inquiries)
  } catch (err) { next(err) }
})

// PATCH /api/inquiries/admin/:id — 답변 달기 (운영자)
router.patch('/admin/:id', authMiddleware, OPERATOR, async (req, res, next) => {
  try {
    const { adminReply } = req.body
    if (!adminReply || adminReply.trim().length === 0) {
      return res.status(400).json({ message: '답변 내용을 입력해주세요.' })
    }
    if (adminReply.length > 2000) {
      return res.status(400).json({ message: '답변은 2000자 이내로 입력해주세요.' })
    }

    const inquiry = await prisma.inquiry.findUnique({
      where: { id: req.params.id },
      include: { user: { select: { name: true } } },
    })
    if (!inquiry) return res.status(404).json({ message: '문의를 찾을 수 없습니다.' })

    const updated = await prisma.inquiry.update({
      where: { id: req.params.id },
      data: { adminReply: adminReply.trim(), status: 'ANSWERED', repliedAt: new Date() },
    })

    // 문의자에게 알림
    createNotifications({
      userIds: [inquiry.userId],
      type: 'INQUIRY_ANSWERED',
      title: '문의 답변이 등록되었습니다',
      content: adminReply.trim().slice(0, 100),
      relatedTargetId: inquiry.id,
    }).catch(e => console.error('[notify inquiry]', e.message))

    audit(req.user.id, 'ANSWER_INQUIRY', 'INQUIRY', req.params.id, `${inquiry.user.name}의 문의 답변`)
    res.json(updated)
  } catch (err) { next(err) }
})

// DELETE /api/inquiries/admin/:id — 문의 삭제 (운영자)
router.delete('/admin/:id', authMiddleware, OPERATOR, async (req, res, next) => {
  try {
    const inquiry = await prisma.inquiry.findUnique({
      where: { id: req.params.id },
      include: { user: { select: { name: true } } },
    })
    if (!inquiry) return res.status(404).json({ message: '문의를 찾을 수 없습니다.' })

    await prisma.inquiry.delete({ where: { id: req.params.id } })
    audit(req.user.id, 'DELETE_INQUIRY', 'INQUIRY', req.params.id, `${inquiry.user.name}의 문의 삭제`)
    res.json({ message: '문의가 삭제되었습니다.' })
  } catch (err) { next(err) }
})

module.exports = router

const express = require('express')
const { PrismaClient } = require('@prisma/client')
const authMiddleware = require('../middleware/auth')

const router = express.Router()
const prisma = new PrismaClient()

// UC-N02: 알림 목록 조회
// GET /api/notifications
// BR-N02: 본인 알림만
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { receiverId: req.user.id },
      orderBy: { createdAt: 'desc' },
    })
    res.json(notifications)
  } catch (err) {
    next(err)
  }
})

// UC-N04: 읽지 않은 알림 조회
// GET /api/notifications/unread
// BR-N03: isRead=false 조건
router.get('/unread', authMiddleware, async (req, res, next) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { receiverId: req.user.id, isRead: false },
      orderBy: { createdAt: 'desc' },
    })
    res.json(notifications)
  } catch (err) {
    next(err)
  }
})

// 알림 전체 읽음 처리
// PATCH /api/notifications/read-all
router.patch('/read-all', authMiddleware, async (req, res, next) => {
  try {
    await prisma.notification.updateMany({
      where: { receiverId: req.user.id, isRead: false },
      data: { isRead: true, readAt: new Date() },
    })
    res.json({ message: '모든 알림을 읽음 처리했습니다.' })
  } catch (err) {
    next(err)
  }
})

// UC-N03: 알림 읽음 처리
// PATCH /api/notifications/:id/read
// BR-N02: 본인 알림 소유권 검증 | BR-N08: readAt 기록
router.patch('/:id/read', authMiddleware, async (req, res, next) => {
  try {
    const notification = await prisma.notification.findUnique({
      where: { id: req.params.id },
    })

    if (!notification) {
      return res.status(404).json({ message: '알림을 찾을 수 없습니다.' })
    }
    if (notification.receiverId !== req.user.id) {
      return res.status(403).json({ message: '접근 권한이 없습니다.' })
    }

    // 이미 읽음 상태면 그대로 정상 응답
    if (notification.isRead) {
      return res.json(notification)
    }

    const updated = await prisma.notification.update({
      where: { id: req.params.id },
      data: { isRead: true, readAt: new Date() },
    })

    res.json(updated)
  } catch (err) {
    next(err)
  }
})

// 알림 개별 삭제
// DELETE /api/notifications/:id
router.delete('/:id', authMiddleware, async (req, res, next) => {
  try {
    const notification = await prisma.notification.findUnique({
      where: { id: req.params.id },
    })

    if (!notification) return res.status(404).json({ message: '알림을 찾을 수 없습니다.' })
    if (notification.receiverId !== req.user.id) {
      return res.status(403).json({ message: '접근 권한이 없습니다.' })
    }

    await prisma.notification.delete({ where: { id: req.params.id } })
    res.json({ message: '알림이 삭제되었습니다.' })
  } catch (err) {
    next(err)
  }
})

module.exports = router

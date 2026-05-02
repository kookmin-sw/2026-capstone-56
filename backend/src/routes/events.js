const express = require('express')
const { PrismaClient } = require('@prisma/client')
const authMiddleware = require('../middleware/auth')
const { requireRole } = authMiddleware
const { cancelPayment } = require('../services/toss')

const router = express.Router()
const prisma = new PrismaClient()

const ACTIVE_STATUSES = ['PENDING_PAYMENT', 'CONFIRMED', 'CANCELLATION_REQUESTED', 'REFUND_FAILED', 'CHECKED_IN']

// 관리 권한 헬퍼: 호스트 본인, 같은 학교 SCHOOL_ADMIN, OPERATOR
function canManageEvent(user, event) {
  if (user.role === 'OPERATOR') return true
  if (user.role === 'SCHOOL_ADMIN' && user.schoolId === event.schoolId) return true
  if (event.hostId === user.id) return true
  return false
}

// ─── 행사 CRUD ────────────────────────────────────────────────────────────────

// GET / — 행사 목록 조회
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const { schoolId, status } = req.query
    const where = { deletedAt: null }
    if (schoolId) where.schoolId = schoolId
    if (status) where.status = status

    const events = await prisma.event.findMany({
      where,
      include: {
        host: { select: { id: true, name: true } },
        school: { select: { id: true, name: true } },
        _count: {
          select: { registrations: { where: { status: { in: ACTIVE_STATUSES } } } },
        },
      },
      orderBy: { startAt: 'asc' },
    })
    res.json(events)
  } catch (err) {
    next(err)
  }
})

// GET /:id — 행사 상세 조회 (환불 정책, 취소 자리 수 포함)
router.get('/:id', authMiddleware, async (req, res, next) => {
  try {
    const event = await prisma.event.findUnique({
      where: { id: req.params.id },
      include: {
        host: { select: { id: true, name: true, email: true } },
        school: { select: { id: true, name: true } },
        _count: {
          select: { registrations: { where: { status: { in: ACTIVE_STATUSES } } } },
        },
      },
    })
    if (!event || event.deletedAt) return res.status(404).json({ message: '행사를 찾을 수 없습니다.' })

    const [cancelledCount, myRegistration] = await Promise.all([
      prisma.registration.count({
        where: { eventId: event.id, status: { in: ['CANCELLED', 'EXPIRED'] } },
      }),
      req.user ? prisma.registration.findFirst({
        where: { eventId: event.id, userId: req.user.id, status: { in: ACTIVE_STATUSES } },
      }) : null,
    ])

    res.json({ ...event, cancelledCount, myRegistration })
  } catch (err) {
    next(err)
  }
})

// POST / — 행사 생성 (CERTIFIED 이상, 환불 정책 설정 포함)
router.post('/', authMiddleware, requireRole('CERTIFIED', 'SCHOOL_ADMIN', 'OPERATOR'), async (req, res, next) => {
  try {
    const {
      title, description, schoolId,
      isPaid, price, capacity,
      startAt, endAt, registrationDeadline,
      refundDeadlineType = 'NONE', refundDeadlineValue,
      refundPolicyText, contactEmail, contactPhone,
    } = req.body

    if (!title || !capacity || !startAt || !endAt) {
      return res.status(400).json({ message: '필수 항목이 누락되었습니다. (title, capacity, startAt, endAt)' })
    }
    // BR-19: 유료 행사 최소 금액 100원
    if (isPaid && (!price || price < 100)) {
      return res.status(400).json({ message: '유료 행사는 100원 이상이어야 합니다. (BR-19)' })
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.id } })
    const targetSchoolId = schoolId || user.schoolId
    if (!targetSchoolId) return res.status(400).json({ message: '학교 정보가 없습니다.' })

    // 환불 마감 절대 시각 자동 계산 (5절 refundDeadlineAt)
    let refundDeadlineAt = null
    if (refundDeadlineType !== 'NONE' && refundDeadlineValue) {
      const start = new Date(startAt)
      const ms = refundDeadlineType === 'MINUTES'
        ? refundDeadlineValue * 60 * 1000
        : refundDeadlineValue * 60 * 60 * 1000
      refundDeadlineAt = new Date(start.getTime() - ms)
    }

    const event = await prisma.event.create({
      data: {
        title,
        description,
        schoolId: targetSchoolId,
        hostId: req.user.id,
        isPaid: !!isPaid,
        price: isPaid ? price : null,
        capacity,
        startAt: new Date(startAt),
        endAt: new Date(endAt),
        registrationDeadline: registrationDeadline ? new Date(registrationDeadline) : null,
        refundDeadlineType,
        refundDeadlineValue: refundDeadlineValue || null,
        refundDeadlineAt,
        refundPolicyText,
        contactEmail,
        contactPhone,
        status: 'DRAFT',
      },
    })

    res.status(201).json(event)
  } catch (err) {
    next(err)
  }
})

// PUT /:id/publish — 행사 공개
router.put('/:id/publish', authMiddleware, async (req, res, next) => {
  try {
    const event = await prisma.event.findUnique({ where: { id: req.params.id } })
    if (!event || event.deletedAt) return res.status(404).json({ message: '행사를 찾을 수 없습니다.' })

    const user = await prisma.user.findUnique({ where: { id: req.user.id } })
    if (!canManageEvent(user, event)) return res.status(403).json({ message: '권한이 없습니다.' })

    const updated = await prisma.event.update({
      where: { id: event.id },
      data: { status: 'PUBLISHED' },
    })
    res.json(updated)
  } catch (err) {
    next(err)
  }
})

// DELETE /:id — 행사 삭제 (UC-P05, soft delete + 자동 환불 큐 등록)
router.delete('/:id', authMiddleware, async (req, res, next) => {
  try {
    const event = await prisma.event.findUnique({ where: { id: req.params.id } })
    if (!event || event.deletedAt) return res.status(404).json({ message: '행사를 찾을 수 없습니다.' })

    const user = await prisma.user.findUnique({ where: { id: req.user.id } })
    if (!canManageEvent(user, event)) return res.status(403).json({ message: '권한이 없습니다.' })

    const [freeCount, paidCount] = await Promise.all([
      event.isPaid ? Promise.resolve(0) : prisma.registration.count({
        where: { eventId: event.id, status: { in: ['CONFIRMED', 'PENDING_PAYMENT', 'CHECKED_IN'] } },
      }),
      event.isPaid ? prisma.registration.count({
        where: { eventId: event.id, status: { in: ['CONFIRMED', 'CHECKED_IN'] } },
      }) : Promise.resolve(0),
    ])

    await prisma.$transaction(async (tx) => {
      await tx.event.update({ where: { id: event.id }, data: { deletedAt: new Date() } })

      if (event.isPaid) {
        // PENDING_PAYMENT → EXPIRED (실제 결제 없음)
        await tx.registration.updateMany({
          where: { eventId: event.id, status: 'PENDING_PAYMENT' },
          data: { status: 'EXPIRED' },
        })
        // CONFIRMED/CHECKED_IN → CANCELLATION_REQUESTED (환불 큐)
        await tx.registration.updateMany({
          where: { eventId: event.id, status: { in: ['CONFIRMED', 'CHECKED_IN'] } },
          data: {
            status: 'CANCELLATION_REQUESTED',
            cancelReason: '행사 삭제로 인한 자동 환불',
            nextRetryAt: null,
          },
        })
      } else {
        // 무료 행사: 즉시 CANCELLED
        await tx.registration.updateMany({
          where: { eventId: event.id, status: { in: ['CONFIRMED', 'PENDING_PAYMENT', 'CHECKED_IN'] } },
          data: { status: 'CANCELLED' },
        })
      }
    })

    // 유료 환불 건에 멱등키 부여 (트랜잭션 밖에서 처리)
    if (event.isPaid) {
      const regsNeedingKey = await prisma.registration.findMany({
        where: { eventId: event.id, status: 'CANCELLATION_REQUESTED', idempotencyKey: null },
      })
      for (const reg of regsNeedingKey) {
        await prisma.registration.update({
          where: { id: reg.id },
          data: { idempotencyKey: `${reg.id}-cancel-${Date.now()}` },
        })
      }
    }

    res.json({
      message: '행사가 삭제되었습니다.',
      freeCancelled: freeCount,
      paidRefundQueued: paidCount,
    })
  } catch (err) {
    next(err)
  }
})

// ─── 참여자 관리 ──────────────────────────────────────────────────────────────

// GET /:eventId/registrations — 참여자 목록 조회 (호스트/관리자, UC-P07)
router.get('/:eventId/registrations', authMiddleware, async (req, res, next) => {
  try {
    const event = await prisma.event.findFirst({ where: { id: req.params.eventId } })
    if (!event) return res.status(404).json({ message: '행사를 찾을 수 없습니다.' })

    const user = await prisma.user.findUnique({ where: { id: req.user.id } })
    if (!canManageEvent(user, event)) return res.status(403).json({ message: '권한이 없습니다.' })

    const registrations = await prisma.registration.findMany({
      where: { eventId: req.params.eventId },
      include: {
        user: { select: { id: true, name: true, email: true, studentId: true } },
      },
      orderBy: { createdAt: 'asc' },
    })

    res.json(registrations)
  } catch (err) {
    next(err)
  }
})

// POST /:eventId/registrations/bulk-refund — 일괄 환불 트리거 (OPERATOR 전용)
// 주의: :regId/refund 보다 먼저 정의해야 'bulk-refund'가 :regId로 매칭되지 않음
router.post('/:eventId/registrations/bulk-refund', authMiddleware, requireRole('OPERATOR'), async (req, res, next) => {
  try {
    const { eventId } = req.params

    const regs = await prisma.registration.findMany({
      where: { eventId, status: { in: ['CONFIRMED', 'CHECKED_IN'] } },
    })

    let queued = 0
    for (const reg of regs) {
      const idempotencyKey = reg.idempotencyKey || `${reg.id}-cancel-${Date.now()}`
      await prisma.registration.update({
        where: { id: reg.id },
        data: {
          status: 'CANCELLATION_REQUESTED',
          idempotencyKey,
          cancelReason: reg.cancelReason || '일괄 환불 처리',
          nextRetryAt: null,
        },
      })
      queued++
    }

    res.json({ message: `${queued}건의 환불이 큐에 등록되었습니다.` })
  } catch (err) {
    next(err)
  }
})

// POST /:eventId/registrations/:regId/refund — 관리자 환불 처리 (UC-P04)
router.post('/:eventId/registrations/:regId/refund', authMiddleware, async (req, res, next) => {
  try {
    const { eventId, regId } = req.params
    const { cancelReason } = req.body

    const [event, registration, user] = await Promise.all([
      prisma.event.findUnique({ where: { id: eventId } }),
      prisma.registration.findUnique({ where: { id: regId } }),
      prisma.user.findUnique({ where: { id: req.user.id } }),
    ])

    if (!event) return res.status(404).json({ message: '행사를 찾을 수 없습니다.' })
    if (!registration || registration.eventId !== eventId) {
      return res.status(404).json({ message: '신청 정보를 찾을 수 없습니다.' })
    }
    // BR-P02/P06: 환불 마감 여부 무관, 호스트/관리자는 처리 가능
    if (!canManageEvent(user, event)) return res.status(403).json({ message: '권한이 없습니다.' })
    if (!['CONFIRMED', 'CHECKED_IN'].includes(registration.status)) {
      return res.status(400).json({ message: '환불 처리할 수 없는 상태입니다.' })
    }
    if (!registration.paymentKey) {
      return res.status(400).json({ message: '결제 정보가 없습니다.' })
    }

    const idempotencyKey = `${registration.id}-cancel-${Date.now()}`

    // Phase 1: CANCELLATION_REQUESTED + 멱등키 + 처리자 기록
    await prisma.registration.update({
      where: { id: regId },
      data: {
        status: 'CANCELLATION_REQUESTED',
        idempotencyKey,
        cancelReason: cancelReason || '관리자 처리',
        cancelledBy: req.user.id,
      },
    })

    // Phase 2: 토스 결제 취소 API 호출
    try {
      await cancelPayment({
        paymentKey: registration.paymentKey,
        cancelReason: cancelReason || '관리자 처리',
        idempotencyKey,
      })

      await prisma.registration.update({
        where: { id: regId },
        data: { status: 'CANCELLED', refundedAmount: registration.paidAmount, refundedAt: new Date() },
      })

      res.json({ message: '환불이 완료되었습니다.' })
    } catch (tossErr) {
      const tossCode = tossErr.response?.data?.code

      if (tossCode === 'ALREADY_CANCELED') {
        await prisma.registration.update({
          where: { id: regId },
          data: { status: 'CANCELLED', refundedAmount: registration.paidAmount, refundedAt: new Date() },
        })
        return res.json({ message: '환불이 완료되었습니다.' })
      }

      // 일시적 실패 → 환불 큐에서 재시도
      await prisma.registration.update({
        where: { id: regId },
        data: { retryCount: 0, nextRetryAt: new Date(Date.now() + 60000) },
      })
      res.json({ message: '환불 요청이 접수되었습니다. 처리 중입니다.' })
    }
  } catch (err) {
    next(err)
  }
})

module.exports = router

const express = require('express')
const path = require('path')
const multer = require('multer')
const XLSX = require('xlsx')
const { PrismaClient } = require('@prisma/client')
const authMiddleware = require('../middleware/auth')
const { requireRole, optionalAuth } = authMiddleware
const { cancelPayment } = require('../services/toss')
const supabase = require('../services/supabase')
const audit = require('../utils/audit')
const { releaseAll, getNextReleaseInfo } = require('../services/releaseService')

const STORAGE_BUCKET = 'event-images'

// 파일은 메모리에만 버퍼링 (디스크 사용 안 함 → 배포 환경 안전)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },  // 5MB
  fileFilter: (req, file, cb) => {
    cb(null, /image\/(jpeg|png|webp)/.test(file.mimetype))
  },
})

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

// ─── 이미지 업로드 ────────────────────────────────────────────────────────────

// POST /upload-image — 대표 이미지 업로드 (CERTIFIED 이상)
// 주의: /:id 보다 앞에 정의해야 'upload-image'가 :id로 매칭되지 않음
router.post('/upload-image', authMiddleware, requireRole('CERTIFIED', 'SCHOOL_ADMIN', 'OPERATOR'),
  upload.single('image'),
  async (req, res) => {
    if (!req.file) return res.status(400).json({ message: '이미지 파일이 필요합니다. (JPG·PNG·WEBP, 최대 5MB)' })

    const ext = path.extname(req.file.originalname).toLowerCase() || '.jpg'
    const storagePath = `events/${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`

    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false,
      })

    if (error) {
      console.error('Supabase Storage upload error:', error)
      return res.status(500).json({ message: '이미지 업로드에 실패했습니다.', detail: error.message })
    }

    const { data: { publicUrl } } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(storagePath)

    res.json({ imageUrl: publicUrl })
  }
)

// ─── 행사 CRUD ────────────────────────────────────────────────────────────────

// GET /mine — 내가 주최한 행사 목록 (호스트 본인, SCHOOL_ADMIN: 학교 전체)
// 주의: /:id 보다 앞에 정의해야 'mine'이 :id로 매칭되지 않음
router.get('/mine', authMiddleware, async (req, res, next) => {
  try {
    const where = { deletedAt: null }

    if (req.user.role === 'SCHOOL_ADMIN') {
      const me = await prisma.user.findUnique({ where: { id: req.user.id }, select: { schoolId: true } })
      if (!me?.schoolId) return res.json([])
      where.schoolId = me.schoolId
    } else if (req.user.role === 'OPERATOR') {
      // 운영자는 전체 중 본인 주최 행사만
      where.hostId = req.user.id
    } else {
      where.hostId = req.user.id
    }

    const events = await prisma.event.findMany({
      where,
      include: {
        school: { select: { id: true, name: true } },
        _count: {
          select: { registrations: { where: { status: { in: ACTIVE_STATUSES } } } },
        },
        reviews: { select: { rating: true } },
        registrations: { where: { status: 'CHECKED_IN' }, select: { id: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    const result = events.map(({ reviews, registrations: checkedInRegs, ...e }) => {
      const reviewCount = reviews.length
      const reviewAvg = reviewCount > 0
        ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviewCount) * 10) / 10
        : null
      return { ...e, reviewAvg, reviewCount, checkedInCount: checkedInRegs.length }
    })

    res.json(result)
  } catch (err) {
    next(err)
  }
})

// POST /release-all — 취소표 일괄 릴리즈 (UC-14, 시스템 토큰 전용)
// 주의: /:id 보다 앞에 정의
router.post('/release-all', async (req, res, next) => {
  try {
    const token = req.headers['x-system-token']
    if (!token || token !== process.env.SYSTEM_TOKEN) {
      return res.status(401).json({ message: '시스템 토큰 인증 실패' })
    }
    const result = await releaseAll()
    res.json(result)
  } catch (err) {
    next(err)
  }
})

// GET / — 행사 목록 조회 (UC-05, BR-01 비로그인 허용)
// 일반사용자: 본인 학교만(BR-02). 비로그인/SCHOOL_ADMIN/OPERATOR: schoolId 쿼리 우선, 없으면 전체.
router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const { schoolId, status } = req.query
    const where = { deletedAt: null }

    if (req.user?.role === 'ATTENDEE') {
      const me = await prisma.user.findUnique({ where: { id: req.user.id }, select: { schoolId: true } })
      if (!me?.schoolId) return res.json([])
      where.schoolId = me.schoolId
    } else if (schoolId) {
      where.schoolId = schoolId
    }

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

// GET /:id — 행사 상세 조회 (UC-05, 비로그인 허용)
router.get('/:id', optionalAuth, async (req, res, next) => {
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

    // BR-02: 일반사용자는 본인 학교 행사만 상세 조회 가능
    if (req.user?.role === 'ATTENDEE') {
      const me = await prisma.user.findUnique({ where: { id: req.user.id }, select: { schoolId: true } })
      if (me?.schoolId && event.schoolId !== me.schoolId) {
        return res.status(403).json({ message: '본인 학교 행사만 조회할 수 있습니다.' })
      }
    }

    // 누적 취소 자리 수 (UI 표시용)
    const cancelledCount = await prisma.registration.count({
      where: { eventId: event.id, status: { in: ['CANCELLED', 'EXPIRED'] } },
    })

    // BR-17: 릴리즈 대기 중인 잠긴 자리 수 — 프론트가 실제 가용 좌석 계산에 사용
    let lockedCount = 0
    if (event.releaseIntervalMinutes) {
      const since = event.lastReleaseAt ?? new Date(0)
      lockedCount = await prisma.registration.count({
        where: {
          eventId: event.id,
          status: { in: ['CANCELLED', 'EXPIRED'] },
          updatedAt: { gt: since },
        },
      })
    }

    // 본인 활성 신청 상태(로그인 시)
    let myRegistration = null
    if (req.user) {
      myRegistration = await prisma.registration.findFirst({
        where: { eventId: event.id, userId: req.user.id, status: { in: ACTIVE_STATUSES } },
        select: { id: true, status: true, orderId: true },
      })
    }

    res.json({ ...event, cancelledCount, lockedCount, myRegistration })
  } catch (err) {
    next(err)
  }
})

// GET /:id/next-release — 다음 취소표 릴리즈 시각 조회 (UC-15, 비로그인 허용)
router.get('/:id/next-release', optionalAuth, async (req, res, next) => {
  try {
    const info = await getNextReleaseInfo(req.params.id)
    if (!info) return res.status(404).json({ message: '행사를 찾을 수 없습니다.' })
    res.json(info)
  } catch (err) {
    next(err)
  }
})

// POST / — 행사 생성 (UC-01)
router.post('/', authMiddleware, requireRole('CERTIFIED', 'SCHOOL_ADMIN', 'OPERATOR'), async (req, res, next) => {
  try {
    const {
      title, description, location, schoolId,
      isPaid, price, capacity,
      startAt, endAt, registrationDeadline,
      releaseIntervalMinutes,
      imageUrl,
      publishAt,
      refundContact,
      refundDeadlineType = 'NONE', refundDeadlineValue,
      refundPolicyText, contactEmail, contactPhone,
    } = req.body

    if (!title || !capacity || !startAt || !endAt) {
      return res.status(400).json({ message: '필수 항목이 누락되었습니다. (title, capacity, startAt, endAt)' })
    }

    // BR-20: 시작 시각은 현재 이후
    const startDate = new Date(startAt)
    const endDate = new Date(endAt)
    if (startDate <= new Date()) {
      return res.status(400).json({ message: '행사 시작 시각은 현재 시각 이후여야 합니다. (BR-20)' })
    }
    if (endDate <= startDate) {
      return res.status(400).json({ message: '행사 종료 시각은 시작 시각 이후여야 합니다.' })
    }
    // BR-21: 신청 마감은 시작 이전
    if (registrationDeadline && new Date(registrationDeadline) >= startDate) {
      return res.status(400).json({ message: '신청 마감 시각은 행사 시작 이전이어야 합니다. (BR-21)' })
    }
    // BR-22: 정원 1 이상
    if (capacity < 1) {
      return res.status(400).json({ message: '정원은 1 이상이어야 합니다. (BR-22)' })
    }
    // BR-23: 유료 행사 최소 금액 100원
    if (isPaid && (!price || price < 100)) {
      return res.status(400).json({ message: '유료 행사는 100원 이상이어야 합니다. (BR-23)' })
    }
    // BR-24: 릴리즈 주기는 5/15/30/60 중 하나
    if (releaseIntervalMinutes != null && ![5, 15, 30, 60].includes(releaseIntervalMinutes)) {
      return res.status(400).json({ message: '취소표 릴리즈 주기는 5/15/30/60 중 하나여야 합니다. (BR-24)' })
    }
    // publishAt 검증: 유효한 시각이어야 하며 행사 시작 이전이어야 함
    if (publishAt) {
      const publishDate = new Date(publishAt)
      if (isNaN(publishDate.getTime())) {
        return res.status(400).json({ message: '유효하지 않은 오픈 시각입니다.' })
      }
      if (publishDate >= startDate) {
        return res.status(400).json({ message: '오픈 시각은 행사 시작 시각 이전이어야 합니다.' })
      }
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { school: { select: { name: true } } },
    })
    const targetSchoolId = schoolId || user.schoolId
    if (!targetSchoolId) return res.status(400).json({ message: '학교 정보가 없습니다.' })

    // 환불 마감 절대 시각 자동 계산 (payment 도메인이 BR-P01에서 사용)
    let refundDeadlineAt = null
    if (refundDeadlineType !== 'NONE' && refundDeadlineValue) {
      const ms = refundDeadlineType === 'MINUTES'
        ? refundDeadlineValue * 60 * 1000
        : refundDeadlineValue * 60 * 60 * 1000
      refundDeadlineAt = new Date(startDate.getTime() - ms)
    }

    const event = await prisma.event.create({
      data: {
        title,
        description,
        location,
        schoolId: targetSchoolId,
        hostId: req.user.id,
        // BR-05: 호스트 스냅샷 (권한 변경과 무관하게 영구 보존)
        hostNameSnapshot: user.name,
        hostAffiliationSnapshot: user.school?.name ?? null,
        imageUrl: imageUrl ?? null,
        publishAt: publishAt ? new Date(publishAt) : null,
        isPaid: !!isPaid,
        price: isPaid ? price : null,
        capacity,
        startAt: startDate,
        endAt: endDate,
        registrationDeadline: registrationDeadline ? new Date(registrationDeadline) : null,
        releaseIntervalMinutes: releaseIntervalMinutes ?? null,
        refundContact: refundContact ?? null,
        refundDeadlineType,
        refundDeadlineValue: refundDeadlineValue || null,
        refundDeadlineAt,
        refundPolicyText,
        contactEmail,
        contactPhone,
        status: 'PUBLISHED',
      },
    })

    audit(req.user.id, 'CREATE_EVENT', 'EVENT', event.id, event.title)
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
    audit(req.user.id, 'PUBLISH_EVENT', 'EVENT', event.id, event.title)
    res.json(updated)
  } catch (err) {
    next(err)
  }
})

// PUT /:id — 행사 수정 (UC-02)
router.put('/:id', authMiddleware, async (req, res, next) => {
  try {
    const event = await prisma.event.findUnique({ where: { id: req.params.id } })
    if (!event || event.deletedAt) return res.status(404).json({ message: '행사를 찾을 수 없습니다.' })

    const user = await prisma.user.findUnique({ where: { id: req.user.id } })
    if (!canManageEvent(user, event)) return res.status(403).json({ message: '권한이 없습니다.' })

    const now = new Date()
    const isStarted = event.startAt <= now

    const {
      title, description, location,
      startAt, endAt, registrationDeadline,
      capacity, isPaid, price,
      releaseIntervalMinutes, imageUrl, publishAt,
      refundContact, refundDeadlineType, refundDeadlineValue,
    } = req.body

    // BR-26: 행사 시작 후에는 종료 시각만 수정 가능
    if (isStarted) {
      if (!endAt) return res.status(400).json({ message: '행사 시작 후에는 종료 시각만 수정할 수 있습니다. (BR-26)' })
      const newEnd = new Date(endAt)
      if (newEnd <= event.startAt) return res.status(400).json({ message: '종료 시각은 시작 시각 이후여야 합니다.' })
      const updated = await prisma.event.update({ where: { id: event.id }, data: { endAt: newEnd } })
      audit(req.user.id, 'UPDATE_EVENT', 'EVENT', event.id, event.title)
      return res.json(updated)
    }

    const activeCount = await prisma.registration.count({
      where: { eventId: event.id, status: { in: ACTIVE_STATUSES } },
    })

    // BR-25: 정원은 활성 신청자 수 이하로 줄일 수 없음
    if (capacity !== undefined && Number(capacity) < activeCount) {
      return res.status(400).json({ message: `정원은 현재 신청자 수(${activeCount}명) 이상이어야 합니다. (BR-25)` })
    }
    // BR-27: 유/무료 전환은 신청자 0명일 때만 가능
    if (isPaid !== undefined && !!isPaid !== event.isPaid && activeCount > 0) {
      return res.status(400).json({ message: '신청자가 있는 경우 유/무료 전환이 불가합니다. (BR-27)' })
    }

    const newStartAt = startAt ? new Date(startAt) : event.startAt
    const newEndAt = endAt ? new Date(endAt) : event.endAt

    if (startAt && newStartAt <= now) {
      return res.status(400).json({ message: '행사 시작 시각은 현재 시각 이후여야 합니다.' })
    }
    if (newEndAt <= newStartAt) {
      return res.status(400).json({ message: '종료 시각은 시작 시각 이후여야 합니다.' })
    }
    if (registrationDeadline && new Date(registrationDeadline) >= newStartAt) {
      return res.status(400).json({ message: '신청 마감은 행사 시작 이전이어야 합니다.' })
    }

    // 환불 마감 절대 시각 재계산
    const effectiveType = refundDeadlineType ?? event.refundDeadlineType
    const effectiveValue = refundDeadlineValue ?? event.refundDeadlineValue
    let refundDeadlineAt = event.refundDeadlineAt
    if (refundDeadlineType !== undefined || refundDeadlineValue !== undefined || startAt) {
      if (effectiveType !== 'NONE' && effectiveValue) {
        const ms = effectiveType === 'MINUTES' ? effectiveValue * 60 * 1000 : effectiveValue * 60 * 60 * 1000
        refundDeadlineAt = new Date(newStartAt.getTime() - ms)
      } else {
        refundDeadlineAt = null
      }
    }

    const data = { refundDeadlineAt }
    if (title !== undefined) data.title = title
    if (description !== undefined) data.description = description
    if (location !== undefined) data.location = location
    if (startAt) data.startAt = newStartAt
    if (endAt) data.endAt = newEndAt
    if (registrationDeadline !== undefined) data.registrationDeadline = registrationDeadline ? new Date(registrationDeadline) : null
    if (capacity !== undefined) data.capacity = Number(capacity)
    if (isPaid !== undefined) { data.isPaid = !!isPaid; data.price = isPaid ? Number(price) : null }
    if (releaseIntervalMinutes !== undefined) data.releaseIntervalMinutes = Number(releaseIntervalMinutes)
    if (imageUrl !== undefined) data.imageUrl = imageUrl || null
    if (publishAt !== undefined) data.publishAt = publishAt ? new Date(publishAt) : null
    if (refundContact !== undefined) data.refundContact = refundContact
    if (refundDeadlineType !== undefined) data.refundDeadlineType = refundDeadlineType
    if (refundDeadlineValue !== undefined) data.refundDeadlineValue = refundDeadlineValue

    const updated = await prisma.event.update({ where: { id: event.id }, data })
    audit(req.user.id, 'UPDATE_EVENT', 'EVENT', event.id, event.title)
    res.json(updated)
  } catch (err) {
    next(err)
  }
})

// POST /:id/close — 행사 마감 (UC-03)
router.post('/:id/close', authMiddleware, async (req, res, next) => {
  try {
    const event = await prisma.event.findUnique({ where: { id: req.params.id } })
    if (!event || event.deletedAt) return res.status(404).json({ message: '행사를 찾을 수 없습니다.' })

    const user = await prisma.user.findUnique({ where: { id: req.user.id } })
    if (!canManageEvent(user, event)) return res.status(403).json({ message: '권한이 없습니다.' })

    if (event.status !== 'PUBLISHED') {
      return res.status(400).json({ message: '공개 중인 행사만 마감할 수 있습니다.' })
    }

    const updated = await prisma.event.update({
      where: { id: event.id },
      data: { status: 'CLOSED', closedAt: new Date() },
    })
    audit(req.user.id, 'CLOSE_EVENT', 'EVENT', event.id, event.title)
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

      // Q&A 소프트 딜리트 (행사 삭제 시 함께 처리)
      await tx.eventQuestion.updateMany({
        where: { eventId: event.id, deletedAt: null },
        data: { deletedAt: new Date() },
      })

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

    audit(req.user.id, 'DELETE_EVENT', 'EVENT', event.id, event.title)
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

// ─── 레포트 다운로드 ───────────────────────────────────────────────────────────
// GET /:eventId/report?format=csv|xlsx — 호스트(권한 회수 후에도), SCHOOL_ADMIN, OPERATOR (BR-06, BR-44)
router.get('/:eventId/report', authMiddleware, async (req, res, next) => {
  try {
    const { eventId } = req.params
    const format = req.query.format === 'xlsx' ? 'xlsx' : 'csv'

    const event = await prisma.event.findFirst({
      where: { id: eventId },
      include: { host: { select: { name: true } } },
    })
    if (!event) return res.status(404).json({ message: '행사를 찾을 수 없습니다.' })

    // BR-06: 호스트는 권한 회수 여부와 무관하게 접근 가능 — hostId로만 판정
    const isHost = event.hostId === req.user.id
    const isSchoolAdmin = req.user.role === 'SCHOOL_ADMIN' && req.user.schoolId === event.schoolId
    const isOperator = req.user.role === 'OPERATOR'
    if (!isHost && !isSchoolAdmin && !isOperator) {
      return res.status(403).json({ message: '레포트 다운로드 권한이 없습니다.' })
    }

    const [registrations, reviews] = await Promise.all([
      prisma.registration.findMany({
        where: { eventId },
        include: { user: { select: { name: true, email: true, studentId: true } } },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.review.findMany({ where: { eventId }, select: { rating: true } }),
    ])

    // 통계 계산
    const ACTIVE = ['CONFIRMED', 'CHECKED_IN', 'CANCELLATION_REQUESTED', 'REFUND_FAILED']
    const totalReg = registrations.filter(r => ACTIVE.includes(r.status)).length
    const checkedIn = registrations.filter(r => r.status === 'CHECKED_IN').length
    const noShow = registrations.filter(r => r.status === 'CONFIRMED').length
    const cancelled = registrations.filter(r => ['CANCELLED', 'EXPIRED'].includes(r.status)).length
    const totalPaid = registrations.reduce((s, r) => s + (r.paidAmount ?? 0), 0)
    const totalRefunded = registrations.reduce((s, r) => s + (r.refundedAmount ?? 0), 0)
    const avgRating = reviews.length > 0
      ? Math.round(reviews.reduce((s, r) => s + r.rating, 0) / reviews.length * 10) / 10
      : null

    const fmt = (iso) => iso ? new Date(iso).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }) : '-'

    // 행사 정보 섹션
    const infoRows = [
      ['행사명', event.title],
      ['주최자', event.hostNameSnapshot ?? event.host?.name ?? '-'],
      ['시작일시', fmt(event.startAt)],
      ['종료일시', fmt(event.endAt)],
      ['장소', event.location ?? '-'],
      ['정원', event.capacity],
      ['총 신청자', totalReg],
      ['체크인', checkedIn],
      ['노쇼', noShow],
      ['취소', cancelled],
      ['총 결제액', totalPaid],
      ['총 환불액', totalRefunded],
      ['평균 평점', avgRating ?? '리뷰 없음'],
    ]

    // 신청자 명단 헤더 + 행
    const listHeader = ['이름', '이메일', '학번', '신청시각', '상태', '체크인시각', '결제금액', '환불금액']
    const listRows = registrations.map(r => [
      r.user.name,
      r.user.email,
      r.user.studentId ?? '-',
      fmt(r.createdAt),
      r.status,
      fmt(r.checkedInAt),
      r.paidAmount ?? 0,
      r.refundedAmount ?? 0,
    ])

    // BR-44: 다운로드 로그 기록
    audit(req.user.id, 'DOWNLOAD_REPORT', 'EVENT', event.id, `${event.title} (${format})`)

    if (format === 'xlsx') {
      const wb = XLSX.utils.book_new()

      const ws1 = XLSX.utils.aoa_to_sheet([['항목', '값'], ...infoRows])
      XLSX.utils.book_append_sheet(wb, ws1, '행사정보')

      const ws2 = XLSX.utils.aoa_to_sheet([listHeader, ...listRows])
      XLSX.utils.book_append_sheet(wb, ws2, '신청자명단')

      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      res.setHeader('Content-Disposition', `attachment; filename="report_${eventId}.xlsx"`)
      return res.send(buffer)
    }

    // CSV: 두 섹션을 빈 줄로 구분
    const escape = (v) => {
      const s = String(v ?? '')
      return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s
    }
    const toRow = (arr) => arr.map(escape).join(',')

    const csvLines = [
      '# 행사 정보',
      toRow(['항목', '값']),
      ...infoRows.map(toRow),
      '',
      '# 신청자 명단',
      toRow(listHeader),
      ...listRows.map(toRow),
    ]

    const BOM = '﻿' // UTF-8 BOM for Excel compatibility
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="report_${eventId}.csv"`)
    return res.send(BOM + csvLines.join('\r\n'))
  } catch (err) {
    next(err)
  }
})

module.exports = router

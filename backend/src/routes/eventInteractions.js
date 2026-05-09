const express = require('express')
const { PrismaClient } = require('@prisma/client')
const authMiddleware = require('../middleware/auth')
const { requireRole, optionalAuth } = authMiddleware
const { createNotifications } = require('../services/notificationService')

const router = express.Router()
const prisma = new PrismaClient()

// ─── 질문 목록 조회 ─────────────────────────────────────────────────────────────
// GET /events/:id/questions — 비로그인 허용 (BR-01)
router.get('/events/:id/questions', optionalAuth, async (req, res, next) => {
  try {
    const questions = await prisma.eventQuestion.findMany({
      where: { eventId: req.params.id, deletedAt: null },
      orderBy: { createdAt: 'asc' },
      include: {
        author: { select: { id: true, name: true } },
        answer: {
          include: { author: { select: { id: true, name: true } } },
        },
      },
    })

    const result = questions.map((q) => ({
      id: q.id,
      body: q.body,
      isAnonymous: q.isAnonymous,
      authorId: q.isAnonymous ? null : q.authorId,
      authorName: q.isAnonymous ? '익명' : q.author.name,
      createdAt: q.createdAt,
      updatedAt: q.updatedAt,
      answer: q.answer
        ? {
            id: q.answer.id,
            body: q.answer.body,
            authorName: q.answer.author.name,
            createdAt: q.answer.createdAt,
            updatedAt: q.answer.updatedAt,
          }
        : null,
    }))

    res.json(result)
  } catch (err) {
    next(err)
  }
})

// ─── 질문 등록 ──────────────────────────────────────────────────────────────────
// POST /events/:id/questions — 로그인 필수 (BR-33)
router.post('/events/:id/questions', authMiddleware, async (req, res, next) => {
  try {
    const { body, isAnonymous = false } = req.body
    if (!body || !body.trim()) return res.status(400).json({ message: '질문 내용을 입력해주세요.' })
    if (body.trim().length > 200) return res.status(400).json({ message: '질문은 200자 이내로 입력해주세요.' })

    const event = await prisma.event.findFirst({ where: { id: req.params.id, deletedAt: null } })
    if (!event) return res.status(404).json({ message: '행사를 찾을 수 없습니다.' })

    const question = await prisma.eventQuestion.create({
      data: {
        eventId: req.params.id,
        authorId: req.user.id,
        body: body.trim(),
        isAnonymous,
      },
    })

    res.status(201).json({
      id: question.id,
      body: question.body,
      isAnonymous: question.isAnonymous,
      authorName: isAnonymous ? '익명' : req.user.name,
      createdAt: question.createdAt,
      answer: null,
    })

    // 호스트에게 새 질문 알림 (본인이 직접 질문한 경우 제외)
    if (event.hostId !== req.user.id) {
      createNotifications({
        type: 'NEW_QUESTION',
        receiverIds: [event.hostId],
        title: `[${event.title}] 새 질문이 등록되었습니다`,
        content: body.trim().slice(0, 80),
        relatedTargetId: req.params.id,
      }).catch(e => console.error('[notify new-question]', e.message))
    }
  } catch (err) {
    next(err)
  }
})

// ─── 질문 수정 ──────────────────────────────────────────────────────────────────
// PUT /events/:id/questions/:qid — 작성자 본인, 답변 없을 때만 (BR-35)
router.put('/events/:id/questions/:qid', authMiddleware, async (req, res, next) => {
  try {
    const { body } = req.body
    if (!body || !body.trim()) return res.status(400).json({ message: '질문 내용을 입력해주세요.' })
    if (body.trim().length > 200) return res.status(400).json({ message: '질문은 200자 이내로 입력해주세요.' })

    const question = await prisma.eventQuestion.findFirst({
      where: { id: req.params.qid, eventId: req.params.id, deletedAt: null },
      include: { answer: true },
    })
    if (!question) return res.status(404).json({ message: '질문을 찾을 수 없습니다.' })
    if (question.authorId !== req.user.id) return res.status(403).json({ message: '수정 권한이 없습니다.' })
    if (question.answer) return res.status(409).json({ message: '답변이 달린 질문은 수정할 수 없습니다.' })

    const updated = await prisma.eventQuestion.update({
      where: { id: req.params.qid },
      data: { body: body.trim() },
    })

    res.json({ id: updated.id, body: updated.body, updatedAt: updated.updatedAt })
  } catch (err) {
    next(err)
  }
})

// ─── 질문 삭제 ──────────────────────────────────────────────────────────────────
// DELETE /events/:id/questions/:qid — 작성자 본인, 답변 없을 때만 (BR-35)
router.delete('/events/:id/questions/:qid', authMiddleware, async (req, res, next) => {
  try {
    const question = await prisma.eventQuestion.findFirst({
      where: { id: req.params.qid, eventId: req.params.id, deletedAt: null },
      include: { answer: true },
    })
    if (!question) return res.status(404).json({ message: '질문을 찾을 수 없습니다.' })
    if (question.authorId !== req.user.id) return res.status(403).json({ message: '삭제 권한이 없습니다.' })
    if (question.answer) return res.status(409).json({ message: '답변이 달린 질문은 삭제할 수 없습니다.' })

    await prisma.eventQuestion.update({
      where: { id: req.params.qid },
      data: { deletedAt: new Date() },
    })

    res.json({ message: '삭제되었습니다.' })
  } catch (err) {
    next(err)
  }
})

// ─── 답변 등록/수정 ─────────────────────────────────────────────────────────────
// POST /events/:id/questions/:qid/answer — 호스트(CERTIFIED 권한 유지) (BR-07)
router.post('/events/:id/questions/:qid/answer', authMiddleware, requireRole('CERTIFIED', 'SCHOOL_ADMIN', 'OPERATOR'), async (req, res, next) => {
  try {
    const { body } = req.body
    if (!body || !body.trim()) return res.status(400).json({ message: '답변 내용을 입력해주세요.' })
    if (body.trim().length > 200) return res.status(400).json({ message: '답변은 200자 이내로 입력해주세요.' })

    const event = await prisma.event.findFirst({ where: { id: req.params.id, deletedAt: null } })
    if (!event) return res.status(404).json({ message: '행사를 찾을 수 없습니다.' })

    // 호스트·공동호스트·SCHOOL_ADMIN(같은 학교)·OPERATOR만 답변 가능
    const isHost = event.hostId === req.user.id
    const isCoHost = !isHost && await prisma.eventCoHost.findFirst({
      where: { eventId: req.params.id, userId: req.user.id },
    })
    const isSchoolAdmin = req.user.role === 'SCHOOL_ADMIN' && req.user.schoolId === event.schoolId
    const isOperator = req.user.role === 'OPERATOR'
    if (!isHost && !isCoHost && !isSchoolAdmin && !isOperator) {
      return res.status(403).json({ message: '답변 권한이 없습니다.' })
    }

    const question = await prisma.eventQuestion.findFirst({
      where: { id: req.params.qid, eventId: req.params.id, deletedAt: null },
      include: { answer: true },
    })
    if (!question) return res.status(404).json({ message: '질문을 찾을 수 없습니다.' })

    const isNewAnswer = !question.answer
    let answer
    if (!isNewAnswer) {
      // 이미 답변이 있으면 수정 (BR-36: 한 질문에 답변 1개)
      answer = await prisma.questionAnswer.update({
        where: { id: question.answer.id },
        data: { body: body.trim() },
        include: { author: { select: { name: true } } },
      })
    } else {
      answer = await prisma.questionAnswer.create({
        data: {
          questionId: req.params.qid,
          authorId: req.user.id,
          body: body.trim(),
        },
        include: { author: { select: { name: true } } },
      })
    }

    res.status(isNewAnswer ? 201 : 200).json({
      id: answer.id,
      body: answer.body,
      authorName: answer.author.name,
      createdAt: answer.createdAt,
      updatedAt: answer.updatedAt,
    })

    // 신규 답변 등록 시에만 질문자에게 알림 (수정 시 재알림 없음, 본인 질문 답변 제외)
    if (isNewAnswer && question.authorId !== req.user.id) {
      createNotifications({
        type: 'QUESTION_ANSWERED',
        receiverIds: [question.authorId],
        title: `[${event.title}] 질문에 답변이 달렸습니다`,
        content: body.trim().slice(0, 80),
        relatedTargetId: req.params.id,
      }).catch(e => console.error('[notify answer]', e.message))
    }
  } catch (err) {
    next(err)
  }
})

// ─── 호스트 평균 평점 재계산 헬퍼 ────────────────────────────────────────────────
async function recalcHostRating(prismaClient, hostId) {
  const rows = await prismaClient.review.findMany({
    where: { event: { hostId } },
    select: { rating: true },
  })
  const count = rows.length
  await prismaClient.user.update({
    where: { id: hostId },
    data: {
      hostRating: count > 0 ? rows.reduce((s, r) => s + r.rating, 0) / count : null,
      ratingCount: count,
    },
  })
}

// ─── 리뷰 목록 조회 ─────────────────────────────────────────────────────────────
// GET /events/:id/reviews — 비로그인 허용 (BR-01)
router.get('/events/:id/reviews', optionalAuth, async (req, res, next) => {
  try {
    const reviews = await prisma.review.findMany({
      where: { eventId: req.params.id },
      orderBy: { createdAt: 'asc' },
      include: { author: { select: { id: true, name: true } } },
    })

    const result = reviews.map((r) => ({
      id: r.id,
      rating: r.rating,
      body: r.body,
      isAnonymous: r.isAnonymous,
      authorId: r.isAnonymous ? null : r.authorId,
      authorName: r.isAnonymous ? '익명' : r.author.name,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      lockedAt: r.lockedAt,
    }))

    res.json(result)
  } catch (err) {
    next(err)
  }
})

// ─── 리뷰 등록 ──────────────────────────────────────────────────────────────────
// POST /events/:id/reviews — 체크인 완료자만 (BR-37), 행사 종료 후만
router.post('/events/:id/reviews', authMiddleware, async (req, res, next) => {
  try {
    const { body, rating, isAnonymous = false } = req.body
    if (!body || !body.trim()) return res.status(400).json({ message: '리뷰 내용을 입력해주세요.' })
    if (body.trim().length > 200) return res.status(400).json({ message: '리뷰는 200자 이내로 입력해주세요.' })
    if (!rating || !Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ message: '별점은 1~5 사이의 정수여야 합니다.' })
    }

    const event = await prisma.event.findFirst({ where: { id: req.params.id, deletedAt: null } })
    if (!event) return res.status(404).json({ message: '행사를 찾을 수 없습니다.' })

    if (new Date(event.endAt) > new Date()) {
      return res.status(400).json({ message: '행사 종료 후에만 리뷰를 작성할 수 있습니다.' })
    }

    const registration = await prisma.registration.findFirst({
      where: { eventId: req.params.id, userId: req.user.id, status: 'CHECKED_IN' },
    })
    if (!registration) return res.status(403).json({ message: '체크인한 참여자만 리뷰를 작성할 수 있습니다.' })

    const existing = await prisma.review.findFirst({
      where: { eventId: req.params.id, authorId: req.user.id },
    })
    if (existing) return res.status(409).json({ message: '이미 리뷰를 작성하셨습니다.' })

    const lockedAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    const review = await prisma.review.create({
      data: {
        eventId: req.params.id,
        authorId: req.user.id,
        rating,
        body: body.trim(),
        isAnonymous,
        lockedAt,
      },
    })

    res.status(201).json({
      id: review.id,
      rating: review.rating,
      body: review.body,
      isAnonymous: review.isAnonymous,
      authorId: isAnonymous ? null : req.user.id,
      authorName: isAnonymous ? '익명' : req.user.name,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
      lockedAt: review.lockedAt,
    })

    recalcHostRating(prisma, event.hostId).catch((e) => console.error('[recalcHostRating]', e.message))
  } catch (err) {
    next(err)
  }
})

// ─── 리뷰 수정 ──────────────────────────────────────────────────────────────────
// PUT /events/:id/reviews/:rid — 작성자 본인, 7일 이내 (BR-38)
router.put('/events/:id/reviews/:rid', authMiddleware, async (req, res, next) => {
  try {
    const { body, rating } = req.body
    if (body === undefined && rating === undefined) {
      return res.status(400).json({ message: '수정할 내용(body 또는 rating)을 입력해주세요.' })
    }
    if (body !== undefined) {
      if (!body.trim()) return res.status(400).json({ message: '리뷰 내용을 입력해주세요.' })
      if (body.trim().length > 200) return res.status(400).json({ message: '리뷰는 200자 이내로 입력해주세요.' })
    }
    if (rating !== undefined && (!Number.isInteger(rating) || rating < 1 || rating > 5)) {
      return res.status(400).json({ message: '별점은 1~5 사이의 정수여야 합니다.' })
    }

    const review = await prisma.review.findFirst({
      where: { id: req.params.rid, eventId: req.params.id },
      include: { event: { select: { hostId: true } } },
    })
    if (!review) return res.status(404).json({ message: '리뷰를 찾을 수 없습니다.' })
    if (review.authorId !== req.user.id) return res.status(403).json({ message: '수정 권한이 없습니다.' })
    if (review.lockedAt && new Date() > new Date(review.lockedAt)) {
      return res.status(409).json({ message: '수정 가능 기간(7일)이 지났습니다.' })
    }

    const updates = {}
    if (body !== undefined) updates.body = body.trim()
    if (rating !== undefined) updates.rating = rating

    const updated = await prisma.review.update({
      where: { id: req.params.rid },
      data: updates,
    })

    res.json({
      id: updated.id,
      rating: updated.rating,
      body: updated.body,
      updatedAt: updated.updatedAt,
    })

    recalcHostRating(prisma, review.event.hostId).catch((e) => console.error('[recalcHostRating]', e.message))
  } catch (err) {
    next(err)
  }
})

module.exports = router

const express = require('express')
const { PrismaClient } = require('@prisma/client')
const authMiddleware = require('../middleware/auth')
const { requireRole } = require('../middleware/auth')
const { createNotifications } = require('../services/notificationService')

const router = express.Router()
const prisma = new PrismaClient()

const OPERATOR = requireRole('OPERATOR')
const SCHOOL_ADMIN = requireRole('SCHOOL_ADMIN')

// ──────────────────────────────────────────────
// UC-NT07: 공지 목록 조회
// GET /api/notices
// BR-NT05: PUBLISHED만 노출 | BR-NT07: 학교 공지는 해당 학교 사용자만
// ──────────────────────────────────────────────
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const { schoolId } = req.user

    const notices = await prisma.notice.findMany({
      where: {
        status: 'PUBLISHED',
        deletedAt: null,
        OR: [
          { scope: 'GLOBAL' },
          { scope: 'SCHOOL', schoolId: schoolId ?? '__none__' },
        ],
      },
      orderBy: { publishedAt: 'desc' },
      select: {
        id: true,
        title: true,
        scope: true,
        schoolId: true,
        publishedAt: true,
        createdAt: true,
        author: { select: { name: true } },
      },
    })

    res.json(notices)
  } catch (err) {
    next(err)
  }
})

// UC-NT07: 공지 상세 조회
// GET /api/notices/:id
router.get('/:id', authMiddleware, async (req, res, next) => {
  try {
    const { schoolId } = req.user
    const notice = await prisma.notice.findFirst({
      where: {
        id: req.params.id,
        status: 'PUBLISHED',
        deletedAt: null,
        OR: [
          { scope: 'GLOBAL' },
          { scope: 'SCHOOL', schoolId: schoolId ?? '__none__' },
        ],
      },
      include: { author: { select: { name: true } } },
    })

    if (!notice) return res.status(404).json({ message: '공지를 찾을 수 없습니다.' })
    res.json(notice)
  } catch (err) {
    next(err)
  }
})

// ──────────────────────────────────────────────
// 운영자 전용 (OPERATOR)
// ──────────────────────────────────────────────

// 운영자용 전체 공지 목록 조회 (DRAFT 포함)
// GET /api/notices/admin/global
router.get('/admin/global', authMiddleware, OPERATOR, async (req, res, next) => {
  try {
    const notices = await prisma.notice.findMany({
      where: { scope: 'GLOBAL', deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: { author: { select: { name: true } } },
    })
    res.json(notices)
  } catch (err) {
    next(err)
  }
})

// UC-NT01: 사이트 전체 공지 작성
// POST /api/admin/notices/global
// BR-NT01: OPERATOR만 | BR-NT09: scope=GLOBAL
router.post('/admin/global', authMiddleware, OPERATOR, async (req, res, next) => {
  try {
    const { title, content } = req.body
    if (!title || !content) {
      return res.status(400).json({ message: '제목과 내용을 입력해주세요.' })
    }

    const notice = await prisma.notice.create({
      data: {
        title,
        content,
        scope: 'GLOBAL',
        status: 'DRAFT',
        authorId: req.user.id,
      },
    })

    res.status(201).json(notice)
  } catch (err) {
    next(err)
  }
})

// UC-NT02: 사이트 전체 공지 등록 (DRAFT → PUBLISHED)
// POST /api/admin/notices/global/:id/publish
// BR-NT05: 등록 후 사용자에게 노출 | BR-N05: 알림 생성 연계
router.post('/admin/global/:id/publish', authMiddleware, OPERATOR, async (req, res, next) => {
  try {
    const notice = await prisma.notice.findFirst({
      where: { id: req.params.id, scope: 'GLOBAL', deletedAt: null },
    })

    if (!notice) return res.status(404).json({ message: '공지를 찾을 수 없습니다.' })
    if (notice.status === 'PUBLISHED') {
      return res.status(409).json({ message: '이미 등록된 공지입니다.' })
    }

    const updated = await prisma.notice.update({
      where: { id: req.params.id },
      data: { status: 'PUBLISHED', publishedAt: new Date() },
    })

    // BR-N05: 전체 사용자 대상 알림 생성
    const users = await prisma.user.findMany({
      where: { deletedAt: null },
      select: { id: true },
    })
    await createNotifications({
      type: 'NOTICE_PUBLISHED',
      receiverIds: users.map(u => u.id),
      title: `새 공지: ${notice.title}`,
      content: notice.content.substring(0, 100),
      relatedTargetId: notice.id,
    })

    res.json(updated)
  } catch (err) {
    next(err)
  }
})

// UC-NT05: 사이트 전체 공지 삭제 (soft delete)
// DELETE /api/admin/notices/global/:id
// BR-NT08: soft delete
router.delete('/admin/global/:id', authMiddleware, OPERATOR, async (req, res, next) => {
  try {
    const notice = await prisma.notice.findFirst({
      where: { id: req.params.id, scope: 'GLOBAL', deletedAt: null },
    })

    if (!notice) return res.status(404).json({ message: '공지를 찾을 수 없습니다.' })

    await prisma.notice.update({
      where: { id: req.params.id },
      data: { status: 'DELETED', deletedAt: new Date() },
    })

    res.json({ message: '공지가 삭제되었습니다.' })
  } catch (err) {
    next(err)
  }
})

// ──────────────────────────────────────────────
// 학교총관리자 전용 (SCHOOL_ADMIN)
// ──────────────────────────────────────────────

// 학교총관리자용 학교 공지 목록 조회 (DRAFT 포함)
// GET /api/notices/school/:schoolId/all
router.get('/school/:schoolId/all', authMiddleware, SCHOOL_ADMIN, async (req, res, next) => {
  try {
    const { schoolId } = req.params
    if (req.user.schoolId !== schoolId) {
      return res.status(403).json({ message: '자신의 학교 공지만 조회할 수 있습니다.' })
    }
    const notices = await prisma.notice.findMany({
      where: { scope: 'SCHOOL', schoolId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: { author: { select: { name: true } } },
    })
    res.json(notices)
  } catch (err) {
    next(err)
  }
})

// UC-NT03: 학교 공지 작성
// POST /api/schools/:schoolId/notices
// BR-NT02: SCHOOL_ADMIN만 | BR-NT03: 자신의 학교만 | BR-NT09: scope=SCHOOL
router.post('/school/:schoolId', authMiddleware, SCHOOL_ADMIN, async (req, res, next) => {
  try {
    const { schoolId } = req.params

    // BR-NT03: 자신의 학교 범위만 관리 가능
    if (req.user.schoolId !== schoolId) {
      return res.status(403).json({ message: '자신의 학교 공지만 작성할 수 있습니다.' })
    }

    const { title, content } = req.body
    if (!title || !content) {
      return res.status(400).json({ message: '제목과 내용을 입력해주세요.' })
    }

    const notice = await prisma.notice.create({
      data: {
        title,
        content,
        scope: 'SCHOOL',
        status: 'DRAFT',
        schoolId,
        authorId: req.user.id,
      },
    })

    res.status(201).json(notice)
  } catch (err) {
    next(err)
  }
})

// UC-NT04: 학교 공지 등록 (DRAFT → PUBLISHED)
// POST /api/schools/:schoolId/notices/:id/publish
router.post('/school/:schoolId/:id/publish', authMiddleware, SCHOOL_ADMIN, async (req, res, next) => {
  try {
    const { schoolId, id } = req.params

    if (req.user.schoolId !== schoolId) {
      return res.status(403).json({ message: '자신의 학교 공지만 관리할 수 있습니다.' })
    }

    const notice = await prisma.notice.findFirst({
      where: { id, scope: 'SCHOOL', schoolId, deletedAt: null },
    })

    if (!notice) return res.status(404).json({ message: '공지를 찾을 수 없습니다.' })
    if (notice.status === 'PUBLISHED') {
      return res.status(409).json({ message: '이미 등록된 공지입니다.' })
    }

    const updated = await prisma.notice.update({
      where: { id },
      data: { status: 'PUBLISHED', publishedAt: new Date() },
    })

    // BR-N05: 해당 학교 사용자 대상 알림 생성
    const schoolUsers = await prisma.user.findMany({
      where: { schoolId, deletedAt: null },
      select: { id: true },
    })
    await createNotifications({
      type: 'NOTICE_PUBLISHED',
      receiverIds: schoolUsers.map(u => u.id),
      title: `새 학교 공지: ${notice.title}`,
      content: notice.content.substring(0, 100),
      relatedTargetId: notice.id,
    })

    res.json(updated)
  } catch (err) {
    next(err)
  }
})

// UC-NT06: 학교 공지 삭제 (soft delete)
// DELETE /api/schools/:schoolId/notices/:id
router.delete('/school/:schoolId/:id', authMiddleware, SCHOOL_ADMIN, async (req, res, next) => {
  try {
    const { schoolId, id } = req.params

    if (req.user.schoolId !== schoolId) {
      return res.status(403).json({ message: '자신의 학교 공지만 삭제할 수 있습니다.' })
    }

    const notice = await prisma.notice.findFirst({
      where: { id, scope: 'SCHOOL', schoolId, deletedAt: null },
    })

    if (!notice) return res.status(404).json({ message: '공지를 찾을 수 없습니다.' })

    await prisma.notice.update({
      where: { id },
      data: { status: 'DELETED', deletedAt: new Date() },
    })

    res.json({ message: '공지가 삭제되었습니다.' })
  } catch (err) {
    next(err)
  }
})

module.exports = router

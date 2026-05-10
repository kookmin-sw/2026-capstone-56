const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

/**
 * 정각 정렬 기준 다음 릴리즈 시각 계산 (BR-43)
 * 예: interval=15분, 현재 14:07 → nextAligned = 14:15
 */
function nextAlignedTime(now, intervalMinutes) {
  const intervalMs = intervalMinutes * 60_000
  return new Date((Math.floor(now.getTime() / intervalMs) + 1) * intervalMs)
}

/**
 * 정각 정렬 기준 현재 윈도우 시작 시각
 * 예: interval=15분, 현재 14:07 → currentAligned = 14:00
 */
function currentAlignedTime(now, intervalMinutes) {
  const intervalMs = intervalMinutes * 60_000
  return new Date(Math.floor(now.getTime() / intervalMs) * intervalMs)
}

/**
 * 행사 하나의 취소표 릴리즈 처리
 * @returns {{ eventId, released?, skipped? }}
 */
async function releaseEvent(event, now) {
  // 2차 신청마감(releaseDeadline) 없으면 startAt-30min 폴백
  const cutoff = event.releaseDeadline
    ?? new Date(event.startAt.getTime() - 30 * 60_000)

  if (now >= cutoff) {
    return { eventId: event.id, skipped: 'RELEASE_DEADLINE_PASSED' }
  }

  // BR-43: 이번 윈도우에서 이미 릴리즈한 경우 스킵
  const aligned = currentAlignedTime(now, event.releaseIntervalMinutes)
  if (event.lastReleaseAt && event.lastReleaseAt.getTime() >= aligned.getTime()) {
    return { eventId: event.id, skipped: 'ALREADY_RELEASED_THIS_WINDOW' }
  }

  // lastReleaseAt 이후 발생한 CANCELLED/EXPIRED 수 (UC-14 Step 3)
  const since = event.lastReleaseAt ?? new Date(0)
  const pendingCount = await prisma.registration.count({
    where: {
      eventId: event.id,
      status: { in: ['CANCELLED', 'EXPIRED'] },
      updatedAt: { gt: since },
    },
  })

  // UC-14 3a: 누적 취소 0 → lastReleaseAt 갱신 안 함
  if (pendingCount === 0) {
    return { eventId: event.id, released: 0 }
  }

  await prisma.event.update({
    where: { id: event.id },
    data: { lastReleaseAt: now },
  })

  console.log(`[ReleaseService] "${event.title}" 취소표 ${pendingCount}석 릴리즈`)
  return { eventId: event.id, released: pendingCount }
}

/**
 * PUBLISHED 상태이고 releaseIntervalMinutes가 설정된 모든 행사 처리
 */
async function releaseAll() {
  const now = new Date()

  const events = await prisma.event.findMany({
    where: {
      status: 'PUBLISHED',
      releaseIntervalMinutes: { not: null },
      deletedAt: null,
    },
    select: {
      id: true, title: true, startAt: true,
      releaseDeadline: true, releaseIntervalMinutes: true, lastReleaseAt: true,
    },
  })

  const results = []
  for (const event of events) {
    try {
      results.push(await releaseEvent(event, now))
    } catch (err) {
      console.error(`[ReleaseService] 행사 ${event.id} 처리 오류:`, err.message)
      results.push({ eventId: event.id, error: err.message })
    }
  }

  return { processed: events.length, results }
}

/**
 * UC-15: 특정 행사의 다음 릴리즈 시각 및 예상 자리 계산
 */
async function getNextReleaseInfo(eventId) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      id: true, status: true, startAt: true,
      releaseDeadline: true, releaseIntervalMinutes: true, lastReleaseAt: true,
    },
  })

  if (!event) return null

  if (!event.releaseIntervalMinutes) {
    return { enabled: false, reason: 'NOT_CONFIGURED' }
  }
  if (event.status !== 'PUBLISHED') {
    return { enabled: false, reason: 'NOT_PUBLISHED' }
  }

  const now = new Date()
  const cutoff = event.releaseDeadline
    ?? new Date(event.startAt.getTime() - 30 * 60_000)

  if (now >= cutoff) {
    return { enabled: false, reason: 'RELEASE_DEADLINE_PASSED' }
  }

  const nextAt = nextAlignedTime(now, event.releaseIntervalMinutes)
  const since = event.lastReleaseAt ?? new Date(0)
  const pendingCount = await prisma.registration.count({
    where: {
      eventId: event.id,
      status: { in: ['CANCELLED', 'EXPIRED'] },
      updatedAt: { gt: since },
    },
  })

  // BR-15: 광클 유발 방지 — 범위로 표시
  const pendingMin = Math.max(0, pendingCount - 2)
  const pendingMax = pendingCount + 2

  return {
    enabled: true,
    nextReleaseAt: nextAt,
    pendingRange: [pendingMin, pendingMax],
  }
}

module.exports = { releaseAll, getNextReleaseInfo }

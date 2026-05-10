const { PrismaClient } = require('@prisma/client')
const { cancelPayment } = require('../services/toss')

const prisma = new PrismaClient()

// UC-P06: 재시도 딜레이 (ms) — 즉시, 1분, 5분, 15분, 1시간
const RETRY_DELAYS = [0, 60_000, 300_000, 900_000, 3_600_000]
const MAX_RETRIES = 4

const PERMANENT_ERRORS = new Set(['EXCEED_MAX_REFUND_DUE', 'INVALID_PAYMENT_KEY'])

// 멱등키 24시간 만료 여부 확인 (BR-38)
function isKeyExpired(key) {
  const ts = parseInt(key.split('-cancel-').pop(), 10)
  return isNaN(ts) || Date.now() - ts > 24 * 60 * 60 * 1000
}

// BR-34: PENDING_PAYMENT 15분 경과 시 자동 EXPIRED
async function expirePendingPayments() {
  try {
    const cutoff = new Date(Date.now() - 15 * 60 * 1000)
    const { count } = await prisma.registration.updateMany({
      where: { status: 'PENDING_PAYMENT', createdAt: { lte: cutoff } },
      data: { status: 'EXPIRED' },
    })
    if (count > 0) console.log(`[RefundWorker] PENDING_PAYMENT ${count}건 자동 만료`)
  } catch (err) {
    console.error('[RefundWorker] expirePendingPayments 오류:', err.message)
  }
}

// UC-P06: CANCELLATION_REQUESTED 건 처리 (백오프 재시도)
async function processRefundQueue() {
  try {
    const pending = await prisma.registration.findMany({
      where: {
        status: 'CANCELLATION_REQUESTED',
        OR: [{ nextRetryAt: null }, { nextRetryAt: { lte: new Date() } }],
      },
      orderBy: { createdAt: 'asc' },
    })

    for (const reg of pending) {
      if (!reg.paymentKey || !reg.idempotencyKey) continue

      // BR-38: 멱등키 24시간 만료 시 재생성
      let idempotencyKey = reg.idempotencyKey
      if (isKeyExpired(idempotencyKey)) {
        idempotencyKey = `${reg.id}-cancel-${Date.now()}`
        await prisma.registration.update({ where: { id: reg.id }, data: { idempotencyKey } })
      }

      try {
        await cancelPayment({
          paymentKey: reg.paymentKey,
          cancelReason: reg.cancelReason || '신청 취소',
          idempotencyKey,
        })

        await prisma.registration.update({
          where: { id: reg.id },
          data: { status: 'CANCELLED', refundedAmount: reg.paidAmount, refundedAt: new Date() },
        })
      } catch (err) {
        const code = err.response?.data?.code

        // 이미 취소된 건: DB만 정합성 보정
        if (code === 'ALREADY_CANCELED') {
          await prisma.registration.update({
            where: { id: reg.id },
            data: { status: 'CANCELLED', refundedAmount: reg.paidAmount, refundedAt: new Date() },
          })
          continue
        }

        const nextRetryCount = reg.retryCount + 1

        // 영구 실패 또는 최대 재시도 초과 → REFUND_FAILED + 운영자 알림
        if (nextRetryCount > MAX_RETRIES || PERMANENT_ERRORS.has(code)) {
          await prisma.registration.update({
            where: { id: reg.id },
            data: { status: 'REFUND_FAILED', retryCount: nextRetryCount },
          })
          console.error(`[RefundWorker] REFUND_FAILED registrationId=${reg.id} code=${code}`)
          // TODO: 운영자 Slack/이메일 알림 연동
          continue
        }

        const delay = RETRY_DELAYS[nextRetryCount] ?? RETRY_DELAYS[RETRY_DELAYS.length - 1]
        await prisma.registration.update({
          where: { id: reg.id },
          data: { retryCount: nextRetryCount, nextRetryAt: new Date(Date.now() + delay) },
        })
      }
    }
  } catch (err) {
    console.error('[RefundWorker] processRefundQueue 오류:', err.message)
  }
}

function start() {
  console.log('[RefundWorker] 시작')
  expirePendingPayments()
  processRefundQueue()
  setInterval(expirePendingPayments, 60_000)
  setInterval(processRefundQueue, 60_000)
}

module.exports = { start, processRefundQueue, expirePendingPayments }

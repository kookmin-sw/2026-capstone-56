const axios = require('axios')

const TOSS_BASE = 'https://api.tosspayments.com/v1'

function authHeader() {
  const key = process.env.TOSS_SECRET_KEY || ''
  return 'Basic ' + Buffer.from(key + ':').toString('base64')
}

async function confirmPayment({ paymentKey, orderId, amount }) {
  const { data } = await axios.post(
    `${TOSS_BASE}/payments/confirm`,
    { paymentKey, orderId, amount },
    { headers: { Authorization: authHeader(), 'Content-Type': 'application/json' } }
  )
  return data
}

async function cancelPayment({ paymentKey, cancelReason, idempotencyKey }) {
  const { data } = await axios.post(
    `${TOSS_BASE}/payments/${paymentKey}/cancel`,
    { cancelReason },
    {
      headers: {
        Authorization: authHeader(),
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey,
      },
    }
  )
  return data
}

module.exports = { confirmPayment, cancelPayment }

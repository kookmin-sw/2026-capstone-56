import api from './axios'

export const preparePayment = async (eventId) => {
  const res = await api.post('/v1/payments/prepare', { eventId })
  return res.data
}

export const confirmPayment = async ({ paymentKey, orderId, amount }) => {
  const res = await api.post('/v1/payments/confirm', { paymentKey, orderId, amount })
  return res.data
}

export const cancelPendingPayment = async (orderId) => {
  const res = await api.post('/v1/payments/cancel-pending', { orderId })
  return res.data
}

export const cancelPaidRegistration = async (id) => {
  const res = await api.post(`/v1/registrations/${id}/cancel`)
  return res.data
}

export const getPaymentHistory = async () => {
  const res = await api.get('/v1/payments/history')
  return res.data
}

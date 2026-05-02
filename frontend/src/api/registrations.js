import api from './axios'

// UC-08: 무료 행사 신청
export const createFreeRegistration = async (eventId) => {
  const res = await api.post('/v1/registrations', { eventId })
  return res.data
}

// UC-11: 무료 신청 취소
export const cancelFreeRegistration = async (id) => {
  const res = await api.post(`/v1/registrations/${id}/cancel-free`)
  return res.data
}

// UC-13: 내 신청 조회
export const getMyRegistrations = async ({ archived = false } = {}) => {
  const res = await api.get('/v1/registrations/me', { params: { archived } })
  return res.data
}

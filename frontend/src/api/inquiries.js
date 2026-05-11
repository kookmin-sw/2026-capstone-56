import api from './axios'

export const createInquiry = async (body) => {
  const res = await api.post('/inquiries', { body })
  return res.data
}

export const getMyInquiries = async () => {
  const res = await api.get('/inquiries/mine')
  return res.data
}

export const deleteMyInquiry = async (id) => {
  const res = await api.delete(`/inquiries/${id}`)
  return res.data
}

export const getAdminInquiries = async (status) => {
  const res = await api.get('/inquiries/admin', { params: status ? { status } : {} })
  return res.data
}

export const answerInquiry = async ({ id, adminReply }) => {
  const res = await api.patch(`/inquiries/admin/${id}`, { adminReply })
  return res.data
}

export const deleteAdminInquiry = async (id) => {
  const res = await api.delete(`/inquiries/admin/${id}`)
  return res.data
}

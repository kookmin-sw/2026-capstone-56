import api from './axios'

export const getNotices = ({ page = 1, limit = 10, q = '' } = {}) => {
  const params = new URLSearchParams({ page, limit })
  if (q) params.set('q', q)
  return api.get(`/notices?${params}`).then(r => r.data)
}
export const getNotice = (id) => api.get(`/notices/${id}`).then(r => r.data)

export const uploadNoticeImage = async (file) => {
  const fd = new FormData()
  fd.append('image', file)
  const res = await api.post('/notices/upload-image', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
  return res.data.imageUrl
}

// 운영자
export const getAdminGlobalNotices = () => api.get('/notices/admin/global').then(r => r.data)
export const createGlobalNotice = (data) => api.post('/notices/admin/global', data).then(r => r.data)
export const publishGlobalNotice = (id) => api.post(`/notices/admin/global/${id}/publish`).then(r => r.data)
export const deleteGlobalNotice = (id) => api.delete(`/notices/admin/global/${id}`).then(r => r.data)

// 학교총관리자
export const getSchoolNotices = (schoolId) => api.get(`/notices/school/${schoolId}/all`).then(r => r.data)
export const createSchoolNotice = (schoolId, data) => api.post(`/notices/school/${schoolId}`, data).then(r => r.data)
export const publishSchoolNotice = (schoolId, id) => api.post(`/notices/school/${schoolId}/${id}/publish`).then(r => r.data)
export const deleteSchoolNotice = (schoolId, id) => api.delete(`/notices/school/${schoolId}/${id}`).then(r => r.data)

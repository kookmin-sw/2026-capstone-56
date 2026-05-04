import api from './axios'

export const getNotices = () => api.get('/notices').then(r => r.data)
export const getNotice = (id) => api.get(`/notices/${id}`).then(r => r.data)

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

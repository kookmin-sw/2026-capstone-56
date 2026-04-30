import api from './axios'

export const getSchools = () => api.get('/schools').then(r => r.data)
export const getSchool = (id) => api.get(`/schools/${id}`).then(r => r.data)
export const createSchool = (data) => api.post('/schools', data).then(r => r.data)
export const updateSchool = (id, data) => api.put(`/schools/${id}`, data).then(r => r.data)
export const deleteSchool = (id) => api.delete(`/schools/${id}`).then(r => r.data)

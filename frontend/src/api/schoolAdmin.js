import api from './axios'

export const getMySchoolUsers = (search) =>
  api.get('/school-admin/users', { params: search ? { search } : {} }).then(r => r.data)

export const updateMySchoolUserRole = (userId, role) =>
  api.put(`/school-admin/users/${userId}/role`, { role }).then(r => r.data)

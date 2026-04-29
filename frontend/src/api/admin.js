import api from './axios'

export const getSchoolUsers = (schoolId, search) =>
  api.get(`/admin/schools/${schoolId}/users`, { params: search ? { search } : {} }).then(r => r.data)

export const updateUserRole = (userId, role) =>
  api.put(`/admin/users/${userId}/role`, { role }).then(r => r.data)

import api from './axios'

const base = (schoolId) => `/schools/${schoolId}/whitelist`

export const getWhitelist = (schoolId) =>
  api.get(base(schoolId)).then(r => r.data)

export const createWhitelist = (schoolId) =>
  api.post(base(schoolId)).then(r => r.data)

export const addEntry = (schoolId, value) =>
  api.post(`${base(schoolId)}/entries`, { value }).then(r => r.data)

export const updateEntry = (schoolId, entryId, value) =>
  api.put(`${base(schoolId)}/entries/${entryId}`, { value }).then(r => r.data)

export const deleteEntry = (schoolId, entryId) =>
  api.delete(`${base(schoolId)}/entries/${entryId}`).then(r => r.data)

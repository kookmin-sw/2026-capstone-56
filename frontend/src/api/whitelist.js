import api from './axios'

const base = (eventId) => `/v1/events/${eventId}/whitelist`

export const getEventWhitelist = (eventId) =>
  api.get(base(eventId)).then(r => r.data)

export const createEventWhitelist = (eventId) =>
  api.post(base(eventId)).then(r => r.data)

export const addWhitelistEntry = (eventId, studentId) =>
  api.post(`${base(eventId)}/entries`, { studentId }).then(r => r.data)

export const uploadWhitelistFile = (eventId, file) => {
  const formData = new FormData()
  formData.append('file', file)
  return api.post(`${base(eventId)}/upload`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(r => r.data)
}

export const deleteWhitelistEntry = (eventId, entryId) =>
  api.delete(`${base(eventId)}/entries/${entryId}`).then(r => r.data)

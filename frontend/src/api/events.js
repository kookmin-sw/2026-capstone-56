import api from './axios'

export const getEvents = async (schoolId) => {
  const res = await api.get('/v1/events', { params: schoolId ? { schoolId } : {} })
  return res.data
}

export const getMyEvents = async () => {
  const res = await api.get('/v1/events/mine')
  return res.data
}

export const getEvent = async (id) => {
  const res = await api.get(`/v1/events/${id}`)
  return res.data
}

export const createEvent = async (data) => {
  const res = await api.post('/v1/events', data)
  return res.data
}

export const updateEvent = async (id, data) => {
  const res = await api.put(`/v1/events/${id}`, data)
  return res.data
}

export const publishEvent = async (id) => {
  const res = await api.put(`/v1/events/${id}/publish`)
  return res.data
}

export const deleteEvent = async (id) => {
  const res = await api.delete(`/v1/events/${id}`)
  return res.data
}

export const getAttendees = async (id) => {
  const res = await api.get(`/v1/events/${id}/attendees`)
  return res.data
}

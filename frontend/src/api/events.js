import api from './axios'

export const getEvents = async (schoolId) => {
  const res = await api.get('/events', { params: schoolId ? { schoolId } : {} })
  return res.data
}

export const getMyEvents = async () => {
  const res = await api.get('/events/mine')
  return res.data
}

export const getEvent = async (id) => {
  const res = await api.get(`/events/${id}`)
  return res.data
}

export const createEvent = async (data) => {
  const res = await api.post('/events', data)
  return res.data
}

export const updateEvent = async (id, data) => {
  const res = await api.put(`/events/${id}`, data)
  return res.data
}

export const deleteEvent = async (id) => {
  const res = await api.delete(`/events/${id}`)
  return res.data
}

export const getAttendees = async (id) => {
  const res = await api.get(`/events/${id}/attendees`)
  return res.data
}

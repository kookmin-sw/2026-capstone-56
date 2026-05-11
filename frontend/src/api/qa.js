import api from './axios'

export const getQuestions = async (eventId) => {
  const res = await api.get(`/v1/events/${eventId}/questions`)
  return res.data
}

export const createQuestion = async (eventId, body, isAnonymous) => {
  const res = await api.post(`/v1/events/${eventId}/questions`, { body, isAnonymous })
  return res.data
}

export const updateQuestion = async (eventId, qid, body) => {
  const res = await api.put(`/v1/events/${eventId}/questions/${qid}`, { body })
  return res.data
}

export const deleteQuestion = async (eventId, qid) => {
  const res = await api.delete(`/v1/events/${eventId}/questions/${qid}`)
  return res.data
}

export const submitAnswer = async (eventId, qid, body) => {
  const res = await api.post(`/v1/events/${eventId}/questions/${qid}/answer`, { body })
  return res.data
}

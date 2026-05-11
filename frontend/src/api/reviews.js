import api from './axios'

export const getReviews = async (eventId) => {
  const res = await api.get(`/v1/events/${eventId}/reviews`)
  return res.data
}

export const createReview = async (eventId, rating, body, isAnonymous) => {
  const res = await api.post(`/v1/events/${eventId}/reviews`, { rating, body, isAnonymous })
  return res.data
}

export const updateReview = async (eventId, rid, rating, body) => {
  const res = await api.put(`/v1/events/${eventId}/reviews/${rid}`, { rating, body })
  return res.data
}

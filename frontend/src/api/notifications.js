import api from './axios'

export const getNotifications = () => api.get('/notifications').then(r => r.data)
export const getUnreadNotifications = () => api.get('/notifications/unread').then(r => r.data)
export const markNotificationRead = (id) => api.patch(`/notifications/${id}/read`).then(r => r.data)
export const markAllNotificationsRead = () => api.patch('/notifications/read-all').then(r => r.data)
export const deleteNotification = (id) => api.delete(`/notifications/${id}`).then(r => r.data)

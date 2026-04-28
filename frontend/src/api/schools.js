import api from './axios'

export const getSchools = () => api.get('/schools').then(r => r.data)

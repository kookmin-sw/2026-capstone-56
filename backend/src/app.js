require('dotenv').config()
const express = require('express')
const cors = require('cors')
const helmet = require('helmet')

const authRoutes = require('./routes/auth')
const schoolRoutes = require('./routes/schools')
const kakaoRoutes = require('./routes/kakao')
const adminRoutes = require('./routes/admin')
const schoolAdminRoutes = require('./routes/schoolAdmin')

const app = express()

app.use(helmet())
app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }))
app.use(express.json())

app.use('/api/auth', authRoutes)
app.use('/api/auth/kakao', kakaoRoutes)
app.use('/api/schools', schoolRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/school-admin', schoolAdminRoutes)

app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ message: '서버 오류가 발생했습니다.' })
})

const PORT = process.env.PORT || 4000
app.listen(PORT, () => console.log(`Auth server running on port ${PORT}`))

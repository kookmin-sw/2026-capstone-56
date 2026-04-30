const jwt = require('jsonwebtoken')

const authMiddleware = (req, res, next) => {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: '인증이 필요합니다.' })
  }
  try {
    const token = header.split(' ')[1]
    req.user = jwt.verify(token, process.env.JWT_SECRET)
    next()
  } catch {
    res.status(401).json({ message: '유효하지 않은 토큰입니다.' })
  }
}

const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: '인증이 필요합니다.' })
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ message: '권한이 없습니다.' })
  }
  next()
}

module.exports = authMiddleware
module.exports.requireRole = requireRole

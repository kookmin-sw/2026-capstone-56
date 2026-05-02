const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

function audit(adminId, action, targetType, targetId, detail) {
  prisma.auditLog.create({
    data: { adminId, action, targetType, targetId: String(targetId), detail: detail || null },
  }).catch(e => console.error('[audit]', e.message))
}

module.exports = audit

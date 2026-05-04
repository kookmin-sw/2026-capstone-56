const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// UC-N01: 알림 생성 (내부 시스템 액터)
// BR-N01: 수신 대상 없으면 생성 생략
// BR-N04: skipDuplicates로 중복 알림 방지 (receiverId + type + relatedTargetId unique)
async function createNotifications({ type, receiverIds, title, content, relatedTargetId }) {
  if (!receiverIds || receiverIds.length === 0) return

  await prisma.notification.createMany({
    data: receiverIds.map(receiverId => ({
      receiverId,
      type,
      title,
      content,
      relatedTargetId,
    })),
    skipDuplicates: true,
  })
}

module.exports = { createNotifications }

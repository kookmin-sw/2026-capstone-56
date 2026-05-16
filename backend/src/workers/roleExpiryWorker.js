const { PrismaClient } = require('@prisma/client')
const { createNotifications } = require('../services/notificationService')

const prisma = new PrismaClient()

// 학생회 CERTIFIED 유저 중 임기 만료된 사람 자동 강등
async function expireCertifiedRoles() {
  try {
    const now = new Date()
    const expired = await prisma.user.findMany({
      where: {
        role: 'CERTIFIED',
        roleExpiresAt: { lte: now },
        deletedAt: null,
      },
      select: { id: true, name: true }
    })

    if (expired.length === 0) return

    for (const user of expired) {
      const activeCount = await prisma.event.count({
        where: { hostId: user.id, status: 'PUBLISHED', deletedAt: null }
      })

      if (activeCount > 0) {
        createNotifications({
          receiverIds: [user.id],
          type: 'ROLE_EXPIRY_BLOCKED',
          title: '인증주최자 권한 만료 보류',
          content: `진행 중인 행사 ${activeCount}건이 있어 권한 만료가 보류되었습니다. 행사 종료 후 자동으로 해제됩니다.`,
          relatedTargetId: user.id,
        }).catch(e => console.error('[RoleExpiryWorker] notify blocked:', e.message))
        console.log(`[RoleExpiryWorker] 만료 보류 userId=${user.id} 진행중 행사 ${activeCount}건`)
        continue
      }

      await prisma.user.update({
        where: { id: user.id },
        data: { role: 'ATTENDEE', roleExpiresAt: null, roleMemo: null }
      })

      createNotifications({
        receiverIds: [user.id],
        type: 'ROLE_EXPIRED',
        title: '인증주최자 권한이 만료되었습니다',
        content: '임기가 종료되어 일반 사용자로 전환되었습니다. 계속 행사를 주최하려면 다시 신청해주세요.',
        relatedTargetId: user.id,
      }).catch(e => console.error('[RoleExpiryWorker] notify expired:', e.message))

      console.log(`[RoleExpiryWorker] 권한 만료 처리 userId=${user.id} (${user.name})`)
    }
  } catch (err) {
    console.error('[RoleExpiryWorker] 오류:', err.message)
  }
}

function start() {
  console.log('[RoleExpiryWorker] 시작')
  expireCertifiedRoles()
  setInterval(expireCertifiedRoles, 60 * 60 * 1000) // 1시간마다
}

module.exports = { start, expireCertifiedRoles }

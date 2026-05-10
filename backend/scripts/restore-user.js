const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const user = await prisma.user.update({
    where: { email: 'test2@kookmin.ac.kr' },
    data: { deletedAt: null },
    select: { id: true, name: true, email: true, role: true, deletedAt: true }
  })
  console.log('복구 완료:', JSON.stringify(user, null, 2))
}

main().catch(console.error).finally(() => prisma.$disconnect())

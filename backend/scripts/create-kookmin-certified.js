const bcrypt = require('bcryptjs')
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const school = await prisma.school.findFirst({ where: { domain: 'kookmin.ac.kr', deletedAt: null } })
  if (!school) { console.log('kookmin.ac.kr 학교 없음'); return }
  console.log('학교:', school.name)

  const hashed = await bcrypt.hash('12345678', 10)
  const existing = await prisma.user.findUnique({ where: { email: 'test2@kookmin.ac.kr' } })

  let user
  if (existing) {
    user = await prisma.user.update({
      where: { email: 'test2@kookmin.ac.kr' },
      data: { password: hashed, role: 'CERTIFIED', emailVerified: true, schoolId: school.id },
      select: { id: true, name: true, email: true, role: true, school: { select: { name: true } } }
    })
    console.log('기존 유저 업데이트')
  } else {
    user = await prisma.user.create({
      data: {
        name: '국민테스트',
        email: 'test2@kookmin.ac.kr',
        password: hashed,
        schoolId: school.id,
        emailVerified: true,
        role: 'CERTIFIED',
      },
      select: { id: true, name: true, email: true, role: true, school: { select: { name: true } } }
    })
  }
  console.log('생성 완료:', JSON.stringify(user, null, 2))
}

main().catch(console.error).finally(() => prisma.$disconnect())

const bcrypt = require('bcryptjs')
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  // 잘못된 anyang 학교/유저 정리
  const wrongUser = await prisma.user.findUnique({ where: { email: 'test@anyang.ac.kr' } })
  if (wrongUser) {
    await prisma.user.delete({ where: { id: wrongUser.id } })
    console.log('anyang 테스트 유저 삭제')
  }
  const wrongSchool = await prisma.school.findUnique({ where: { domain: 'anyang.ac.kr' } })
  if (wrongSchool) {
    await prisma.school.delete({ where: { id: wrongSchool.id } })
    console.log('anyang 학교 삭제')
  }

  // hanyang.ac.kr 학교 없으면 생성
  let school = await prisma.school.findUnique({ where: { domain: 'hanyang.ac.kr' } })
  if (!school) {
    school = await prisma.school.create({
      data: { name: '한양대학교', domain: 'hanyang.ac.kr' }
    })
    console.log('학교 생성:', school.name)
  } else {
    console.log('기존 학교 사용:', school.name)
  }

  // 기존 유저 있으면 삭제
  const existing = await prisma.user.findUnique({ where: { email: 'test@hanyang.ac.kr' } })
  if (existing) {
    await prisma.user.delete({ where: { id: existing.id } })
    console.log('기존 테스트 유저 삭제')
  }

  const hashed = await bcrypt.hash('1234', 10)
  const user = await prisma.user.create({
    data: {
      name: '한양테스트',
      email: 'test@hanyang.ac.kr',
      password: hashed,
      studentId: 'T0001',
      schoolId: school.id,
      emailVerified: true,
      role: 'ATTENDEE',
    },
    select: { id: true, name: true, email: true, role: true, studentId: true, school: { select: { name: true } } }
  })
  console.log('테스트 유저 생성 완료:', JSON.stringify(user, null, 2))
}

main().catch(console.error).finally(() => prisma.$disconnect())

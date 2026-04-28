const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const schools = [
  { name: '서울대학교', domain: 'snu.ac.kr' },
  { name: '한국체육대학교', domain: 'knsu.ac.kr' },
  { name: '서울과학기술대학교', domain: 'seoultech.ac.kr' },
  { name: '서울시립대학교', domain: 'uos.ac.kr' },
  { name: '가톨릭대학교', domain: 'catholic.ac.kr' },
  { name: '감리교신학대학교', domain: 'mtu.ac.kr' },
  { name: '건국대학교', domain: 'konkuk.ac.kr' },
  { name: '경기대학교', domain: 'kyonggi.ac.kr' },
  { name: '경희대학교', domain: 'khu.ac.kr' },
  { name: '고려대학교', domain: 'korea.ac.kr' },
  { name: '광운대학교', domain: 'kw.ac.kr' },
  { name: '국민대학교', domain: 'kookmin.ac.kr' },
  { name: '강서대학교', domain: 'gangseo.ac.kr' },
  { name: '덕성여자대학교', domain: 'duksung.ac.kr' },
  { name: '동국대학교', domain: 'dongguk.edu' },
  { name: '동덕여자대학교', domain: 'dongduk.ac.kr' },
  { name: '명지대학교', domain: 'mju.ac.kr' },
  { name: '삼육대학교', domain: 'syu.ac.kr' },
  { name: '상명대학교', domain: 'smu.ac.kr' },
  { name: '서강대학교', domain: 'sogang.ac.kr' },
  { name: '서경대학교', domain: 'skuniv.ac.kr' },
  { name: '서울여자대학교', domain: 'swu.ac.kr' },
  { name: '성공회대학교', domain: 'skhu.ac.kr' },
  { name: '성균관대학교', domain: 'skku.edu' },
  { name: '성신여자대학교', domain: 'sungshin.ac.kr' },
  { name: '세종대학교', domain: 'sejong.ac.kr' },
  { name: '숙명여자대학교', domain: 'sookmyung.ac.kr' },
  { name: '숭실대학교', domain: 'ssu.ac.kr' },
  { name: '연세대학교', domain: 'yonsei.ac.kr' },
  { name: '이화여자대학교', domain: 'ewha.ac.kr' },
  { name: '장로회신학대학교', domain: 'puts.ac.kr' },
  { name: '중앙대학교', domain: 'cau.ac.kr' },
  { name: '총신대학교', domain: 'chongshin.ac.kr' },
  { name: '추계예술대학교', domain: 'chugye.ac.kr' },
  { name: '한국외국어대학교', domain: 'hufs.ac.kr' },
  { name: '한성대학교', domain: 'hansung.ac.kr' },
  { name: '한양대학교', domain: 'hanyang.ac.kr' },
  { name: '서울한영대학교', domain: 'shyu.ac.kr' },
  { name: '홍익대학교', domain: 'hongik.ac.kr' },
  { name: '서울교육대학교', domain: 'snue.ac.kr' },
]

async function main() {
  let inserted = 0
  let skipped = 0

  for (const school of schools) {
    const result = await prisma.school.upsert({
      where: { domain: school.domain },
      update: { name: school.name },
      create: school,
    })
    if (result) inserted++
  }

  console.log(`완료: ${inserted}개 학교 등록/업데이트`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())

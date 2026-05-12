import EventCard from '../components/EventCard'

const MOCK_EVENTS = [
  {
    id: 'id0',
    title: '2026 봄 대학 축제',
    location: '중앙광장',
    startAt: new Date('2026-05-20T18:00:00').toISOString(),
    capacity: 300,
    isPaid: false,
    price: null,
    imageUrl: null,
    status: 'OPEN',
    scope: 'PUBLIC',
    _count: { registrations: 241, waitlist: 0 },
    host: { isVerifiedHost: true },
    school: null,
  },
  {
    id: 'id2',
    title: '동아리 봄 공연',
    location: '소극장',
    startAt: new Date('2026-05-25T15:00:00').toISOString(),
    capacity: 100,
    isPaid: true,
    price: 5000,
    imageUrl: null,
    status: 'OPEN',
    scope: 'PUBLIC',
    _count: { registrations: 78, waitlist: 0 },
    host: { isVerifiedHost: false },
    school: null,
  },
  {
    id: 'id4',
    title: '취업 특강: 이력서 클리닉',
    location: '강의동 301호',
    startAt: new Date('2026-06-01T14:00:00').toISOString(),
    capacity: 50,
    isPaid: false,
    price: null,
    imageUrl: null,
    status: 'OPEN',
    scope: 'SCHOOL',
    _count: { registrations: 49, waitlist: 3 },
    host: { isVerifiedHost: true },
    school: { name: '국민대학교' },
  },
]

export default function Poster() {
  return (
    <>
      <style>{`
        @media print {
          @page { size: 930mm 1000mm; margin: 0; }
          body * { visibility: hidden; }
          #poster-root, #poster-root * { visibility: visible; }
          #poster-root { position: fixed; top: 0; left: 0; }
        }
      `}</style>

      <div id="poster-root" style={{
        width: '930px',
        height: '1000px',
        overflow: 'hidden',
        background: 'linear-gradient(135deg, #f5f3ff 0%, #e9e5ff 50%, #f0e9ff 100%)',
        fontFamily: '"Freesentation", -apple-system, BlinkMacSystemFont, sans-serif',
        display: 'flex',
        flexDirection: 'column',
        padding: '28px 32px',
        gap: '14px',
        boxSizing: 'border-box',
        position: 'relative',
      }}>

        {/* 배경 블롭 */}
        <div style={{ position: 'absolute', top: '-100px', right: '-100px', width: '400px', height: '400px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-100px', left: '-100px', width: '350px', height: '350px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(236,72,153,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />

        {/* ── 헤더 ── */}
        <div style={{ textAlign: 'center', position: 'relative', zIndex: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px', marginBottom: '6px', position: 'relative', top: '-8px' }}>
            <img src="/logo6.png" alt="festicket" style={{ height: '44px', objectFit: 'contain' }} />
            <span style={{ fontSize: '28px', fontWeight: '900', color: '#1e293b', letterSpacing: '-1px' }}>페스티켓</span>
          </div>
          <h1 style={{ fontSize: '46px', fontWeight: '900', lineHeight: 1.1, margin: '0 0 4px', letterSpacing: '-2px', background: 'linear-gradient(90deg,#7c3aed,#6366f1,#3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            캠퍼스의 모든 행사, 한 곳에서
          </h1>
          <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>대학 축제부터 동아리 모임까지 · 신청부터 QR 체크인까지 한 번에</p>
        </div>

        {/* ── 행사 카드 3개 ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', position: 'relative', zIndex: 10 }}>
          {MOCK_EVENTS.map(event => <EventCard key={event.id} event={event} />)}
        </div>

        {/* ── 주요 기능 4개 ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '10px', position: 'relative', zIndex: 10 }}>
          {[
            { badge: '운영', color: '#3b82f6', title: '행사 관리', items: ['행사 생성 및 수정', 'QR 티켓 발급', '실시간 체크인'] },
            { badge: '참여', color: '#10b981', title: '간편 참여', items: ['행사 둘러보기', '클릭 한 번 신청', 'QR로 입장'] },
            { badge: '결제', color: '#f59e0b', title: '유료 결제', items: ['Toss Payments', '자동 환불 처리', '무료·유료 통합'] },
            { badge: '공지', color: '#8b5cf6', title: '알림 & 공지', items: ['공지사항 게시판', '행사 업데이트 알림', '알림 대량 관리'] },
          ].map((f, i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,0.7)', borderTop: `3px solid ${f.color}`, borderRadius: '12px', padding: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '8px' }}>
                <div style={{ background: f.color, color: 'white', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 'bold', flexShrink: 0, lineHeight: 1, textAlign: 'center' }}>{f.badge}</div>
                <span style={{ fontSize: '12px', fontWeight: '800', color: '#1e293b' }}>{f.title}</span>
              </div>
              {f.items.map((item, j) => (
                <div key={j} style={{ fontSize: '11px', color: '#475569', marginBottom: '3px', display: 'flex', gap: '4px' }}>
                  <span style={{ color: f.color }}>●</span>{item}
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* ── 도메인 + 기술스택 + 아키텍처 ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', position: 'relative', zIndex: 10 }}>
          {/* 도메인 */}
          <div style={{ background: 'rgba(255,255,255,0.7)', borderRadius: '12px', padding: '12px' }}>
            <div style={{ fontSize: '12px', fontWeight: '800', color: '#1e293b', marginBottom: '10px' }}>도메인 구조</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {[
                { color: '#3b82f6', label: '인증', desc: '로그인·권한' },
                { color: '#10b981', label: '행사', desc: '생성·신청' },
                { color: '#f59e0b', label: '결제', desc: '결제·환불' },
                { color: '#8b5cf6', label: '알림', desc: '공지·알림' },
              ].map((d, i) => (
                <div key={i} style={{ borderLeft: `3px solid ${d.color}`, paddingLeft: '6px', background: '#f8fafc', borderRadius: '4px', padding: '6px 6px 6px 8px' }}>
                  <div style={{ fontSize: '11px', fontWeight: '800', color: d.color }}>{d.label}</div>
                  <div style={{ fontSize: '10px', color: '#64748b' }}>{d.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* 기술 스택 */}
          <div style={{ background: 'rgba(255,255,255,0.7)', borderRadius: '12px', padding: '12px' }}>
            <div style={{ fontSize: '12px', fontWeight: '800', color: '#1e293b', marginBottom: '10px' }}>기술 스택</div>
            {[
              { badge: '프론트', color: '#6366f1', value: 'React · TailwindCSS · Framer Motion' },
              { badge: '백엔드', color: '#0ea5e9', value: 'Node.js · Express · Prisma' },
              { badge: 'DB', color: '#10b981', value: 'Supabase PostgreSQL' },
              { badge: '인증', color: '#8b5cf6', value: 'JWT · 카카오 OAuth' },
              { badge: '결제', color: '#f59e0b', value: 'Toss Payments' },
            ].map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '5px' }}>
                <span style={{ background: s.color, color: 'white', padding: '2px 6px', borderRadius: '10px', fontSize: '9px', fontWeight: 'bold', flexShrink: 0, minWidth: '36px', textAlign: 'center' }}>{s.badge}</span>
                <span style={{ fontSize: '10px', color: '#475569' }}>{s.value}</span>
              </div>
            ))}
          </div>

          {/* 아키텍처 */}
          <div style={{ background: 'rgba(255,255,255,0.7)', borderRadius: '12px', padding: '12px' }}>
            <div style={{ fontSize: '12px', fontWeight: '800', color: '#1e293b', marginBottom: '10px' }}>아키텍처</div>
            {[
              'AWS Amplify (SPA 배포)',
              'AWS API Gateway + Express',
              'Supabase PostgreSQL 관리형',
              'JWT + 카카오 OAuth',
              'Toss Payments API',
              'Supabase Storage',
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: '5px', fontSize: '10px', color: '#475569', marginBottom: '4px' }}>
                <span style={{ color: '#6366f1', flexShrink: 0 }}>●</span>{item}
              </div>
            ))}
          </div>
        </div>

        {/* ── 사용 화면 4개 ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '10px', position: 'relative', zIndex: 10 }}>
          {[
            {
              title: '행사 목록', color: '#3730a3', height: '110px',
              body: (
                <div style={{ padding: '6px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-evenly' }}>
                  {[['봄 축제','무료','#6366f1'],['동아리 공연','5,000원','#f43f5e'],['취업 특강','무료','#10b981']].map(([t,p,c],j)=>(
                    <div key={j} style={{ display:'flex', justifyContent:'space-between', padding:'4px 5px', marginBottom:'3px', background:'white', borderRadius:'4px', fontSize:'8px' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:'4px' }}><div style={{ width:'6px',height:'6px',borderRadius:'1px',background:c }} />{t}</div>
                      <span style={{ color:'#64748b' }}>{p}</span>
                    </div>
                  ))}
                </div>
              ),
              desc: '행사 둘러보기',
            },
            {
              title: '행사 신청', color: '#3730a3', height: '110px',
              body: (
                <div style={{ padding: '6px', flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {/* 행사명 + 무료 배지 */}
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                    <div style={{ fontSize:'8px', fontWeight:'bold', color:'#1e293b' }}>2026 봄 대학 축제</div>
                    <span style={{ fontSize:'6px', fontWeight:'bold', background:'#dcfce7', color:'#16a34a', padding:'1px 4px', borderRadius:'3px' }}>무료</span>
                  </div>
                  {/* 일시 + 장소 */}
                  <div style={{ display:'flex', gap:'6px' }}>
                    <div style={{ fontSize:'7px', color:'#64748b' }}>📅 5월 20일 18:00</div>
                    <div style={{ fontSize:'7px', color:'#64748b' }}>📍 중앙광장</div>
                  </div>
                  {/* 신청 현황 */}
                  <div>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'2px' }}>
                      <span style={{ fontSize:'6px', color:'#94a3b8' }}>241 / 300명</span>
                      <span style={{ fontSize:'6px', color:'#10b981', fontWeight:'bold' }}>잔여 59석</span>
                    </div>
                    <div style={{ height:'3px', background:'#e2e8f0', borderRadius:'2px', overflow:'hidden' }}>
                      <div style={{ height:'100%', width:'80%', background:'linear-gradient(90deg,#6366f1,#8b5cf6)', borderRadius:'2px' }} />
                    </div>
                  </div>
                  {/* 신청 버튼 */}
                  <div style={{ background:'linear-gradient(90deg,#6366f1,#8b5cf6)', borderRadius:'4px', padding:'4px', textAlign:'center', marginTop:'auto' }}>
                    <span style={{ fontSize:'8px', fontWeight:'bold', color:'white' }}>지금 신청하기</span>
                  </div>
                </div>
              ),
              desc: '간편 신청',
            },
            {
              title: '🎟️ 내 티켓', color: '#3730a3', height: '110px',
              body: (
                <div style={{ padding: '6px', display:'flex', gap:'6px' }}>
                  <div style={{ flex:1, background:'linear-gradient(135deg,#6366f1,#8b5cf6)', borderRadius:'6px', padding:'8px' }}>
                    <div style={{ fontSize:'8px', fontWeight:'bold', color:'white', marginBottom:'3px' }}>봄 대학 축제</div>
                    <div style={{ fontSize:'7px', color:'rgba(255,255,255,0.75)', marginBottom:'2px' }}>📍 중앙광장</div>
                    <div style={{ fontSize:'7px', color:'rgba(255,255,255,0.75)' }}>📅 5월 20일 18:00</div>
                    <div style={{ borderTop:'1.5px dashed rgba(255,255,255,0.4)', margin:'6px 0' }} />
                    <div style={{ fontSize:'7px', color:'rgba(255,255,255,0.6)' }}>홍길동 · 1매</div>
                  </div>
                  <div style={{ background:'white', borderRadius:'6px', padding:'5px', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <svg width="44" height="44" viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg">
                      {/* 좌상단 눈 */}
                      <rect x="2" y="2" width="16" height="16" rx="2" fill="#6366f1"/>
                      <rect x="4" y="4" width="12" height="12" rx="1" fill="white"/>
                      <rect x="6" y="6" width="8" height="8" rx="1" fill="#6366f1"/>
                      {/* 우상단 눈 */}
                      <rect x="26" y="2" width="16" height="16" rx="2" fill="#6366f1"/>
                      <rect x="28" y="4" width="12" height="12" rx="1" fill="white"/>
                      <rect x="30" y="6" width="8" height="8" rx="1" fill="#6366f1"/>
                      {/* 좌하단 눈 */}
                      <rect x="2" y="26" width="16" height="16" rx="2" fill="#6366f1"/>
                      <rect x="4" y="28" width="12" height="12" rx="1" fill="white"/>
                      <rect x="6" y="30" width="8" height="8" rx="1" fill="#6366f1"/>
                      {/* 데이터 도트 */}
                      <rect x="20" y="2" width="4" height="4" rx="1" fill="#6366f1"/>
                      <rect x="26" y="20" width="4" height="4" rx="1" fill="#6366f1"/>
                      <rect x="32" y="20" width="4" height="4" rx="1" fill="#6366f1"/>
                      <rect x="38" y="20" width="4" height="4" rx="1" fill="#6366f1"/>
                      <rect x="20" y="26" width="4" height="4" rx="1" fill="#6366f1"/>
                      <rect x="20" y="32" width="4" height="4" rx="1" fill="#6366f1"/>
                      <rect x="26" y="32" width="4" height="4" rx="1" fill="#6366f1"/>
                      <rect x="32" y="26" width="4" height="4" rx="1" fill="#6366f1"/>
                      <rect x="38" y="38" width="4" height="4" rx="1" fill="#6366f1"/>
                      <rect x="20" y="38" width="4" height="4" rx="1" fill="#6366f1"/>
                      <rect x="32" y="38" width="4" height="4" rx="1" fill="#6366f1"/>
                      <rect x="20" y="20" width="4" height="4" rx="1" fill="#6366f1"/>
                      <rect x="2" y="20" width="4" height="4" rx="1" fill="#6366f1"/>
                      <rect x="8" y="20" width="4" height="4" rx="1" fill="#6366f1"/>
                    </svg>
                  </div>
                </div>
              ),
              desc: 'QR 티켓',
            },
            {
              title: '⚡ QR 체크인', color: '#3730a3', height: '110px',
              body: (
                <div style={{ padding: '6px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div style={{ border:'2px dashed #6366f1', borderRadius:'6px', padding:'10px', textAlign:'center', marginBottom:'4px' }}>
                    <div style={{ fontSize:'16px', marginBottom:'2px' }}>📷</div>
                    <div style={{ fontSize:'7px', color:'#64748b' }}>QR 스캔</div>
                  </div>
                  <div style={{ background:'#eef2ff', borderRadius:'4px', padding:'3px', textAlign:'center' }}>
                    <span style={{ fontSize:'8px', color:'#6366f1', fontWeight:'bold' }}>✓ 체크인 완료</span>
                  </div>
                </div>
              ),
              desc: '실시간 체크인',
            },
          ].map((s, i) => (
            <div key={i} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'6px' }}>
              <div style={{ width:'100%', height: s.height, background:'#f8fafc', borderRadius:'10px', border:'1px solid #e2e8f0', overflow:'hidden', display:'flex', flexDirection:'column', flex: 1 }}>
                <div style={{ background: s.color, padding:'7px 10px' }}>
                  <div style={{ fontSize:'10px', fontWeight:'bold', color:'white' }}>{s.title}</div>
                </div>
                {s.body}
              </div>
              <div style={{ fontSize:'11px', fontWeight:'700', color:'#1e293b' }}>{s.desc}</div>
            </div>
          ))}
        </div>


      </div>
    </>
  )
}

import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getAdminStats } from '../api/admin'

function fmtDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
}

const ROLE_LABEL = { ATTENDEE: '일반', CERTIFIED: '인증주최자', SCHOOL_ADMIN: '학교관리자', OPERATOR: '운영자' }
const ROLE_COLOR = {
  ATTENDEE: 'bg-gray-100 text-gray-600',
  CERTIFIED: 'bg-blue-100 text-blue-700',
  SCHOOL_ADMIN: 'bg-purple-100 text-purple-700',
  OPERATOR: 'bg-orange-100 text-orange-700',
}
const STATUS_COLOR = {
  PUBLISHED: 'bg-green-100 text-green-700',
  DRAFT: 'bg-amber-100 text-amber-700',
  CANCELLED: 'bg-red-100 text-red-500',
}
const STATUS_LABEL = { PUBLISHED: '공개', DRAFT: '초안', CANCELLED: '취소' }

function StatCard({ label, value, sub, color = 'text-primary-600' }) {
  return (
    <div className="card p-5">
      <p className={`text-3xl font-black ${color}`}>{value ?? '—'}</p>
      <p className="text-sm font-semibold text-gray-700 mt-1">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

export default function OperatorDashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: getAdminStats,
    refetchInterval: 30000,
  })

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="h-8 w-48 bg-gray-100 rounded-full animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="card p-5 h-24 animate-pulse bg-gray-50" />)}
        </div>
      </div>
    )
  }

  const u = stats?.users ?? {}
  const e = stats?.events ?? {}

  return (
    <div className="max-w-5xl mx-auto space-y-8">

      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">운영자 대시보드</h1>
          <p className="text-sm text-gray-400 mt-0.5">플랫폼 전체 현황</p>
        </div>
        <Link to="/admin/schools" className="btn-primary text-sm px-4 py-2 rounded-xl">
          학교 관리
        </Link>
      </div>

      {/* 통계 카드 */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 mb-3 uppercase tracking-wide">전체 통계</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="등록 학교" value={stats?.schools} color="text-indigo-600" />
          <StatCard
            label="전체 사용자"
            value={u.total}
            sub={`인증주최자 ${u.CERTIFIED ?? 0}명 · 학교관리자 ${u.SCHOOL_ADMIN ?? 0}명`}
            color="text-primary-600"
          />
          <StatCard
            label="공개 행사"
            value={e.PUBLISHED ?? 0}
            sub={`초안 ${e.DRAFT ?? 0}건 · 취소 ${e.CANCELLED ?? 0}건`}
            color="text-green-600"
          />
          <StatCard
            label="전체 행사"
            value={e.total}
            color="text-gray-700"
          />
        </div>
      </div>

      {/* 역할별 사용자 분포 */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 mb-3 uppercase tracking-wide">역할별 사용자</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {['ATTENDEE', 'CERTIFIED', 'SCHOOL_ADMIN', 'OPERATOR'].map(role => (
            <div key={role} className="card p-4 flex items-center gap-3">
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${ROLE_COLOR[role]}`}>
                {ROLE_LABEL[role]}
              </span>
              <span className="text-xl font-black text-gray-800">{u[role] ?? 0}</span>
              <span className="text-xs text-gray-400">명</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* 최근 가입 사용자 */}
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <span className="font-semibold text-gray-800 text-sm">최근 가입 사용자</span>
            <Link to="/admin/schools" className="text-xs text-primary-600 hover:underline">학교별 보기 →</Link>
          </div>
          <ul className="divide-y divide-gray-50">
            {(stats?.recentUsers ?? []).length === 0 ? (
              <li className="px-5 py-8 text-center text-sm text-gray-400">가입 사용자가 없습니다.</li>
            ) : (
              stats.recentUsers.map(user => (
                <li key={user.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-xs shrink-0">
                    {user.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold text-gray-800 truncate">{user.name}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${ROLE_COLOR[user.role]}`}>
                        {ROLE_LABEL[user.role]}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400 truncate">{user.email}</div>
                    {user.school && <div className="text-xs text-gray-300">{user.school.name}</div>}
                  </div>
                  <span className="text-xs text-gray-400 shrink-0">{fmtDate(user.createdAt)}</span>
                </li>
              ))
            )}
          </ul>
        </div>

        {/* 최근 생성 행사 */}
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <span className="font-semibold text-gray-800 text-sm">최근 생성 행사</span>
          </div>
          <ul className="divide-y divide-gray-50">
            {(stats?.recentEvents ?? []).length === 0 ? (
              <li className="px-5 py-8 text-center text-sm text-gray-400">생성된 행사가 없습니다.</li>
            ) : (
              stats.recentEvents.map(event => (
                <li key={event.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Link
                        to={`/events/${event.id}`}
                        className="text-sm font-semibold text-gray-800 hover:underline truncate"
                      >
                        {event.title}
                      </Link>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${STATUS_COLOR[event.status]}`}>
                        {STATUS_LABEL[event.status]}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400">
                      {event.school?.name} · {event.host?.name}
                      {event.isPaid && <span className="ml-1 text-blue-400">유료</span>}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs text-gray-500 font-medium">{event._count?.registrations ?? 0}명</div>
                    <div className="text-xs text-gray-300">{fmtDate(event.createdAt)}</div>
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>

      </div>

      {/* 바로가기 */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 mb-3 uppercase tracking-wide">바로가기</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            { to: '/admin/schools', label: '학교 관리', desc: '학교 등록·수정·삭제', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
            { to: '/admin/users', label: '유저 관리', desc: '전체 사용자 조회·역할 변경', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
            { to: '/admin/events', label: '행사 관리', desc: '전체 행사 공개·삭제', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
            { to: '/my-events', label: '내 행사 관리', desc: '내가 만든 행사', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
            { to: '/admin/audit-logs', label: '감사 로그', desc: '관리자 액션 기록', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
          ].map(item => (
            <Link key={item.to} to={item.to} className="card p-4 flex items-center gap-3 hover:shadow-card-hover hover:-translate-y-0.5 transition-all group">
              <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center shrink-0 group-hover:bg-primary-100 transition">
                <svg className="w-5 h-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                </svg>
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-800">{item.label}</div>
                <div className="text-xs text-gray-400">{item.desc}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>

    </div>
  )
}

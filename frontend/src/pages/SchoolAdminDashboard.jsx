import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getMySchoolUsers, updateMySchoolUserRole, getSchoolUserRegistrations } from '../api/schoolAdmin'
import { getMyEvents, publishEvent, deleteEvent } from '../api/events'
import { useToast } from '../components/Toast'
import { useAuth } from '../hooks/useAuth'
import UserTicketsModal from '../components/UserTicketsModal'

// ── 상수 ─────────────────────────────────────────────────────────────────────

const ROLES = [
  { value: 'ATTENDEE', label: '일반' },
  { value: 'CERTIFIED', label: '인증주최자' },
]

const ROLE_BADGE = {
  ATTENDEE: 'bg-gray-100 text-gray-500',
  CERTIFIED: 'bg-blue-100 text-blue-700',
  SCHOOL_ADMIN: 'bg-purple-100 text-purple-700',
  OPERATOR: 'bg-orange-100 text-orange-700',
}
const ROLE_LABEL = {
  ATTENDEE: '일반', CERTIFIED: '인증주최자', SCHOOL_ADMIN: '학교관리자', OPERATOR: '운영자',
}

const STATUS_CONFIG = {
  DRAFT:     { label: '초안',   color: 'bg-amber-100 text-amber-700' },
  PUBLISHED: { label: '공개중', color: 'bg-green-100 text-green-700' },
  CANCELLED: { label: '취소됨', color: 'bg-red-100 text-red-500' },
}

function fmtDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
}

// ── 역할 선택 컴포넌트 ────────────────────────────────────────────────────────

function RoleSelect({ user }) {
  const toast = useToast()
  const queryClient = useQueryClient()
  const canChange = ['ATTENDEE', 'CERTIFIED'].includes(user.role)

  const mutation = useMutation({
    mutationFn: (role) => updateMySchoolUserRole(user.id, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-school-users'] })
      toast('역할이 변경되었습니다.', 'success')
    },
    onError: (err) => toast(err.response?.data?.message || '변경에 실패했습니다.', 'error'),
  })

  if (!canChange) {
    return <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ROLE_BADGE[user.role]}`}>{ROLE_LABEL[user.role] ?? user.role}</span>
  }

  return (
    <div className="flex items-center gap-2">
      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ROLE_BADGE[user.role]}`}>{ROLE_LABEL[user.role]}</span>
      <select
        value={user.role}
        onChange={e => mutation.mutate(e.target.value)}
        disabled={mutation.isPending}
        className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-400 disabled:opacity-50"
      >
        {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
      </select>
    </div>
  )
}

// ── 메인 ─────────────────────────────────────────────────────────────────────

export default function SchoolAdminDashboard() {
  const { user: me } = useAuth()
  const queryClient = useQueryClient()
  const [tab, setTab] = useState('users')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [ticketUser, setTicketUser] = useState(null)
  const [eventTab, setEventTab] = useState('all')
  const [eventSearch, setEventSearch] = useState('')

  // 사용자 조회
  const { data, isLoading: usersLoading } = useQuery({
    queryKey: ['my-school-users', search],
    queryFn: () => getMySchoolUsers(search),
  })
  const school = data?.school
  const users = data?.users ?? []

  // 행사 조회 (getMyEvents → SCHOOL_ADMIN이면 학교 전체 행사 반환)
  const { data: events = [], isLoading: eventsLoading } = useQuery({
    queryKey: ['my-events'],
    queryFn: getMyEvents,
    enabled: tab === 'events',
  })

  const publishMutation = useMutation({
    mutationFn: publishEvent,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-events'] }),
    onError: (err) => alert(err.response?.data?.message ?? '공개 실패'),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteEvent,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-events'] }),
    onError: (err) => alert(err.response?.data?.message ?? '삭제 실패'),
  })

  const filteredEvents = useMemo(() => {
    let list = eventTab === 'all' ? events : events.filter(e => e.status === eventTab)
    if (eventSearch.trim()) {
      const q = eventSearch.trim().toLowerCase()
      list = list.filter(e => e.title.toLowerCase().includes(q) || e.host?.name?.toLowerCase().includes(q))
    }
    return list
  }, [events, eventTab, eventSearch])

  const attendeeCount = users.filter(u => u.role === 'ATTENDEE').length
  const certifiedCount = users.filter(u => u.role === 'CERTIFIED').length

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-6">

      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{school?.name ?? '내 학교'} 관리</h1>
          <p className="text-sm text-gray-400 mt-0.5">{me?.name} · 학교 총 관리자</p>
        </div>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{users.length}</p>
          <p className="text-xs text-gray-400 mt-1">전체 사용자</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{certifiedCount}</p>
          <p className="text-xs text-gray-400 mt-1">인증주최자</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{events.filter(e => e.status === 'PUBLISHED').length}</p>
          <p className="text-xs text-gray-400 mt-1">공개 행사</p>
        </div>
      </div>

      {/* 탭 */}
      <div className="flex gap-2 border-b border-gray-100 pb-0">
        {[
          { value: 'users',  label: '사용자 관리' },
          { value: 'events', label: '행사 관리' },
        ].map(t => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition ${
              tab === t.value
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── 사용자 관리 탭 ── */}
      {tab === 'users' && (
        <>
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-gray-500">소속 사용자 목록</p>
            <form onSubmit={e => { e.preventDefault(); setSearch(searchInput) }} className="flex gap-2">
              <input
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                placeholder="이름 또는 이메일 검색"
                className="input py-2 text-sm w-56"
              />
              <button type="submit" className="btn-primary py-2 text-sm">검색</button>
              {search && (
                <button type="button" onClick={() => { setSearch(''); setSearchInput('') }} className="btn-secondary py-2 text-sm">초기화</button>
              )}
            </form>
          </div>

          <div className="card overflow-hidden">
            {usersLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-8 h-8 border-4 border-primary-400 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-16 text-gray-400 text-sm">
                {search ? '검색 결과가 없습니다.' : '소속 사용자가 없습니다.'}
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-5 py-3.5 font-medium text-gray-600">이름</th>
                    <th className="text-left px-5 py-3.5 font-medium text-gray-600">이메일</th>
                    <th className="text-left px-5 py-3.5 font-medium text-gray-600">학번</th>
                    <th className="text-left px-5 py-3.5 font-medium text-gray-600">이메일인증</th>
                    <th className="text-left px-5 py-3.5 font-medium text-gray-600">역할</th>
                    <th className="px-5 py-3.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {users.map(u => (
                    <tr key={u.id} className="hover:bg-gray-50 transition">
                      <td className="px-5 py-4 font-medium text-gray-900">{u.name}</td>
                      <td className="px-5 py-4 text-gray-500">{u.email}</td>
                      <td className="px-5 py-4 text-gray-400">{u.studentId || '-'}</td>
                      <td className="px-5 py-4">
                        {u.emailVerified
                          ? <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">인증됨</span>
                          : <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">미인증</span>
                        }
                      </td>
                      <td className="px-5 py-4"><RoleSelect user={u} /></td>
                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() => setTicketUser(u)}
                          className="text-xs text-primary-600 hover:underline font-medium"
                        >
                          티켓
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* ── 행사 관리 탭 ── */}
      {tab === 'events' && (
        <>
          <div className="flex items-center gap-3 flex-wrap">
            {/* 상태 필터 */}
            <div className="flex gap-1.5">
              {[
                { value: 'all', label: '전체' },
                { value: 'PUBLISHED', label: '공개중' },
                { value: 'DRAFT', label: '초안' },
                { value: 'CANCELLED', label: '취소됨' },
              ].map(t => (
                <button
                  key={t.value}
                  onClick={() => setEventTab(t.value)}
                  className={`px-3 py-1.5 rounded-xl text-sm font-semibold transition-all ${
                    eventTab === t.value
                      ? 'bg-primary-600 text-white shadow-sm'
                      : 'bg-white text-gray-600 border border-gray-100'
                  }`}
                >
                  {t.label}
                  {t.value !== 'all' && (
                    <span className="ml-1 opacity-70">{events.filter(e => e.status === t.value).length}</span>
                  )}
                </button>
              ))}
            </div>
            <input
              value={eventSearch}
              onChange={e => setEventSearch(e.target.value)}
              placeholder="제목 · 주최자 검색"
              className="ml-auto text-sm border border-gray-200 rounded-xl px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary-300 w-44"
            />
          </div>

          {eventsLoading ? (
            <div className="card p-12 text-center text-gray-400">불러오는 중...</div>
          ) : filteredEvents.length === 0 ? (
            <div className="card p-12 text-center text-gray-400">표시할 행사가 없습니다.</div>
          ) : (
            <div className="card overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-5 py-3.5 font-medium text-gray-600">행사명</th>
                    <th className="text-left px-5 py-3.5 font-medium text-gray-600">주최자</th>
                    <th className="text-left px-5 py-3.5 font-medium text-gray-600">시작일</th>
                    <th className="text-left px-5 py-3.5 font-medium text-gray-600">신청</th>
                    <th className="text-left px-5 py-3.5 font-medium text-gray-600">상태</th>
                    <th className="px-5 py-3.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredEvents.map(event => {
                    const cfg = STATUS_CONFIG[event.status] ?? { label: event.status, color: 'bg-gray-100 text-gray-500' }
                    return (
                      <tr key={event.id} className="hover:bg-gray-50 transition">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <Link to={`/events/${event.id}`} className="font-semibold text-gray-900 hover:text-primary-600 hover:underline line-clamp-1 max-w-[200px]">
                              {event.title}
                            </Link>
                            {event.isPaid && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-500 shrink-0">유료</span>}
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-gray-500">{event.hostNameSnapshot ?? '-'}</td>
                        <td className="px-5 py-3.5 text-gray-400 whitespace-nowrap">{fmtDate(event.startAt)}</td>
                        <td className="px-5 py-3.5 text-gray-600 font-medium">{event._count?.registrations ?? 0}명</td>
                        <td className="px-5 py-3.5">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cfg.color}`}>{cfg.label}</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center justify-end gap-2">
                            <Link to={`/events/${event.id}`} className="text-xs text-gray-500 hover:underline">상세</Link>
                            {event.status === 'DRAFT' && (
                              <button
                                onClick={() => { if (confirm('이 행사를 공개하시겠습니까?')) publishMutation.mutate(event.id) }}
                                disabled={publishMutation.isPending && publishMutation.variables === event.id}
                                className="text-xs text-green-600 hover:underline font-medium disabled:opacity-50"
                              >
                                공개
                              </button>
                            )}
                            {event.status !== 'CANCELLED' && (
                              <button
                                onClick={() => {
                                  if (confirm(`"${event.title}" 행사를 삭제하시겠습니까?\n신청자가 있으면 자동 취소 처리됩니다.`))
                                    deleteMutation.mutate(event.id)
                                }}
                                disabled={deleteMutation.isPending && deleteMutation.variables === event.id}
                                className="text-xs text-red-500 hover:underline font-medium disabled:opacity-50"
                              >
                                삭제
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {ticketUser && (
        <UserTicketsModal
          user={ticketUser}
          fetchFn={getSchoolUserRegistrations}
          onClose={() => setTicketUser(null)}
        />
      )}
    </div>
  )
}

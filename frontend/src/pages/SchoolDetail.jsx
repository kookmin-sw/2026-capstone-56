import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getSchoolUsers, updateUserRole, getUserRegistrations, cancelRegistration } from '../api/admin'
import { useToast } from '../components/Toast'
import UserTicketsModal from '../components/UserTicketsModal'

const ROLES = [
  { value: 'ATTENDEE', label: '일반' },
  { value: 'CERTIFIED', label: '인증주최자' },
  { value: 'SCHOOL_ADMIN', label: '학교관리자' },
]

const ROLE_BADGE = {
  ATTENDEE: 'bg-gray-100 text-gray-600',
  CERTIFIED: 'bg-blue-100 text-blue-700',
  SCHOOL_ADMIN: 'bg-purple-100 text-purple-700',
  OPERATOR: 'bg-orange-100 text-orange-700',
}

function RoleSelect({ user, schoolId }) {
  const toast = useToast()
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (role) => updateUserRole(user.id, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-users', schoolId] })
      toast('역할이 변경되었습니다.', 'success')
    },
    onError: (err) => toast(err.response?.data?.message || '변경에 실패했습니다.', 'error'),
  })

  return (
    <select
      value={user.role}
      onChange={e => mutation.mutate(e.target.value)}
      disabled={mutation.isPending}
      className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-400 disabled:opacity-50"
    >
      {ROLES.map(r => (
        <option key={r.value} value={r.value}>{r.label}</option>
      ))}
    </select>
  )
}

export default function SchoolDetail() {
  const { schoolId } = useParams()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [ticketUser, setTicketUser] = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['school-users', schoolId, search],
    queryFn: () => getSchoolUsers(schoolId, search),
  })

  const school = data?.school
  const users = data?.users ?? []

  const handleSearch = (e) => {
    e.preventDefault()
    setSearch(searchInput)
  }

  return (
    <>
    <div className="max-w-4xl mx-auto px-4 py-10">
      <button
        onClick={() => navigate('/admin/schools')}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6 transition"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        학교 목록
      </button>

      {school && (
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{school.name}</h1>
            <p className="text-sm text-gray-400 mt-0.5">{school.domain} · {school.address || '주소 없음'}</p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-4 gap-4">
        <p className="text-sm text-gray-500">소속 사용자 <span className="font-semibold text-gray-700">{users.length}명</span></p>
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="이름 또는 이메일 검색"
            className="input py-2 text-sm w-56"
          />
          <button type="submit" className="btn-primary py-2 text-sm">검색</button>
          {search && (
            <button
              type="button"
              onClick={() => { setSearch(''); setSearchInput('') }}
              className="btn-secondary py-2 text-sm"
            >
              초기화
            </button>
          )}
        </form>
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
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
              {users.map(user => (
                <tr key={user.id} className="hover:bg-gray-50 transition">
                  <td className="px-5 py-4 font-medium text-gray-900">{user.name}</td>
                  <td className="px-5 py-4 text-gray-500">{user.email}</td>
                  <td className="px-5 py-4 text-gray-400">{user.studentId || '-'}</td>
                  <td className="px-5 py-4">
                    {user.emailVerified
                      ? <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">인증됨</span>
                      : <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">미인증</span>
                    }
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ROLE_BADGE[user.role]}`}>
                        {ROLES.find(r => r.value === user.role)?.label ?? user.role}
                      </span>
                      {user.role !== 'OPERATOR' && <RoleSelect user={user} schoolId={schoolId} />}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button
                      onClick={() => setTicketUser(user)}
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
    </div>

    {ticketUser && (
      <UserTicketsModal
        user={ticketUser}
        fetchFn={getUserRegistrations}
        cancelFn={cancelRegistration}
        onClose={() => setTicketUser(null)}
      />
    )}
    </>
  )
}

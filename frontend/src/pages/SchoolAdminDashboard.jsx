import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getMySchoolUsers, updateMySchoolUserRole } from '../api/schoolAdmin'
import { useToast } from '../components/Toast'
import { useAuth } from '../hooks/useAuth'

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
  ATTENDEE: '일반',
  CERTIFIED: '인증주최자',
  SCHOOL_ADMIN: '학교관리자',
  OPERATOR: '운영자',
}

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
    return (
      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ROLE_BADGE[user.role]}`}>
        {ROLE_LABEL[user.role] ?? user.role}
      </span>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ROLE_BADGE[user.role]}`}>
        {ROLE_LABEL[user.role]}
      </span>
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
    </div>
  )
}

export default function SchoolAdminDashboard() {
  const navigate = useNavigate()
  const { user: me } = useAuth()
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['my-school-users', search],
    queryFn: () => getMySchoolUsers(search),
  })

  const school = data?.school
  const users = data?.users ?? []

  const attendeeCount = users.filter(u => u.role === 'ATTENDEE').length
  const certifiedCount = users.filter(u => u.role === 'CERTIFIED').length

  const handleSearch = (e) => {
    e.preventDefault()
    setSearch(searchInput)
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {school?.name ?? '내 학교'} 관리
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {me?.name} · 학교 총 관리자
          </p>
        </div>
        <button onClick={() => navigate('/school-admin/whitelist')} className="btn-secondary text-sm">
          화이트리스트 관리
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{users.length}</p>
          <p className="text-xs text-gray-400 mt-1">전체 사용자</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{certifiedCount}</p>
          <p className="text-xs text-gray-400 mt-1">인증주최자</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-gray-500">{attendeeCount}</p>
          <p className="text-xs text-gray-400 mt-1">미인증</p>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4 gap-4">
        <p className="text-sm text-gray-500">소속 사용자 목록</p>
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
                  <td className="px-5 py-4">
                    <RoleSelect user={u} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

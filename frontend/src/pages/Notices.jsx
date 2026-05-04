import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { getNotices } from '../api/notices'
import { useAuth } from '../hooks/useAuth'

function fmtDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
}

function NoticeList({ notices }) {
  if (notices.length === 0) {
    return <div className="card p-8 text-center text-sm text-gray-400">등록된 공지가 없습니다.</div>
  }
  return (
    <div className="space-y-2">
      {notices.map(notice => (
        <Link
          key={notice.id}
          to={`/notices/${notice.id}`}
          className="card p-4 flex items-center justify-between hover:shadow-md transition group"
        >
          <span className="font-semibold text-gray-800 truncate group-hover:text-primary-600 transition">
            {notice.title}
          </span>
          <span className="text-xs text-gray-400 shrink-0 ml-4">{fmtDate(notice.publishedAt)}</span>
        </Link>
      ))}
    </div>
  )
}

export default function Notices() {
  const { user } = useAuth()

  const { data: notices = [], isLoading } = useQuery({
    queryKey: ['notices'],
    queryFn: getNotices,
  })

  const globalNotices = notices.filter(n => n.scope === 'GLOBAL')
  const schoolNotices = notices.filter(n => n.scope === 'SCHOOL')

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="card p-5 h-16 animate-pulse bg-gray-50" />
        ))}
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <h1 className="text-2xl font-black text-gray-900">공지사항</h1>

      {/* 전체 공지 */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-100 text-blue-700">전체 공지</span>
          <span className="text-xs text-gray-400">{globalNotices.length}건</span>
        </div>
        <NoticeList notices={globalNotices} />
      </section>

      {/* 학교 공지 — 해당 학교 학생에게만 노출 (백엔드에서 schoolId 필터링) */}
      {user?.schoolId && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-purple-100 text-purple-700">학교 공지</span>
            <span className="text-xs text-gray-400">{schoolNotices.length}건</span>
          </div>
          <NoticeList notices={schoolNotices} />
        </section>
      )}
    </div>
  )
}

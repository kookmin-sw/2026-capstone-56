import { useQuery } from '@tanstack/react-query'
import { useParams, useNavigate } from 'react-router-dom'
import { getNotice } from '../api/notices'

function fmtDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleString('ko-KR', { dateStyle: 'long', timeStyle: 'short' })
}

const SCOPE_LABEL = { GLOBAL: '전체 공지', SCHOOL: '학교 공지' }
const SCOPE_COLOR = { GLOBAL: 'bg-blue-100 text-blue-700', SCHOOL: 'bg-purple-100 text-purple-700' }

export default function NoticeDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const { data: notice, isLoading, isError } = useQuery({
    queryKey: ['notice', id],
    queryFn: () => getNotice(id),
  })

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="h-5 w-24 bg-gray-100 rounded animate-pulse" />
        <div className="card p-8 space-y-4">
          <div className="h-7 w-2/3 bg-gray-100 rounded animate-pulse" />
          <div className="h-4 w-full bg-gray-100 rounded animate-pulse" />
          <div className="h-4 w-5/6 bg-gray-100 rounded animate-pulse" />
        </div>
      </div>
    )
  }

  if (isError || !notice) {
    return (
      <div className="max-w-3xl mx-auto card p-12 text-center space-y-4">
        <p className="text-gray-400">공지를 찾을 수 없습니다.</p>
        <button onClick={() => navigate('/notices')} className="btn-secondary text-sm">목록으로</button>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <button
        onClick={() => navigate('/notices')}
        className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 transition"
      >
        ← 목록으로
      </button>

      <div className="card p-8 space-y-5">
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${SCOPE_COLOR[notice.scope]}`}>
          {SCOPE_LABEL[notice.scope]}
        </span>

        <h1 className="text-2xl font-black text-gray-900">{notice.title}</h1>

        <div className="flex items-center gap-3 text-xs text-gray-400 pb-5 border-b border-gray-100">
          <span>{notice.author?.name}</span>
          <span>·</span>
          <span>{fmtDate(notice.publishedAt)}</span>
        </div>

        <div className="text-gray-700 leading-relaxed whitespace-pre-wrap">{notice.content}</div>
      </div>
    </div>
  )
}

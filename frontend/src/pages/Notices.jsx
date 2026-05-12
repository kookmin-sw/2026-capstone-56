import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { keepPreviousData } from '@tanstack/react-query'
import { getNotices } from '../api/notices'

function fmtDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
}

function Pagination({ page, totalPages, onPage }) {
  if (totalPages <= 1) return null

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
    .reduce((acc, p, idx, arr) => {
      if (idx > 0 && arr[idx - 1] !== p - 1) acc.push('...')
      acc.push(p)
      return acc
    }, [])

  return (
    <div className="flex items-center justify-center gap-1.5">
      <button
        onClick={() => onPage(page - 1)}
        disabled={page === 1}
        className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition"
      >
        이전
      </button>
      {pages.map((p, idx) =>
        p === '...'
          ? <span key={`dots-${idx}`} className="px-2 text-gray-400 text-sm">…</span>
          : (
            <button
              key={p}
              onClick={() => onPage(p)}
              className={`px-3 py-1.5 text-sm rounded-lg border transition ${
                page === p
                  ? 'bg-primary-500 text-white border-primary-500'
                  : 'border-gray-200 hover:bg-gray-50'
              }`}
            >
              {p}
            </button>
          )
      )}
      <button
        onClick={() => onPage(page + 1)}
        disabled={page === totalPages}
        className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition"
      >
        다음
      </button>
    </div>
  )
}

export default function Notices() {
  const [inputVal, setInputVal] = useState('')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['notices', page, q],
    queryFn: () => getNotices({ page, limit: 10, q }),
    placeholderData: keepPreviousData,
  })

  const notices = data?.data ?? []
  const total = data?.total ?? 0
  const totalPages = data?.totalPages ?? 1

  function handleSearch(e) {
    e.preventDefault()
    setQ(inputVal.trim())
    setPage(1)
  }

  function handleReset() {
    setInputVal('')
    setQ('')
    setPage(1)
  }

  if (isLoading && !data) {
    return (
      <div className="max-w-3xl mx-auto space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="card p-5 h-16 animate-pulse bg-gray-50" />
        ))}
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-gray-900">공지사항</h1>
        <span className="text-sm text-gray-400">총 {total}건</span>
      </div>

      {/* 검색 */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="text"
          value={inputVal}
          onChange={e => setInputVal(e.target.value)}
          placeholder="제목으로 검색"
          className="flex-1 border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
        />
        <button type="submit" className="btn-primary px-4 py-2 text-sm">
          검색
        </button>
        {q && (
          <button
            type="button"
            onClick={handleReset}
            className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition"
          >
            초기화
          </button>
        )}
      </form>

      {/* 목록 */}
      {notices.length === 0 ? (
        <div className="card p-8 text-center text-sm text-gray-400">
          {q ? `"${q}"에 해당하는 공지가 없습니다.` : '등록된 공지가 없습니다.'}
        </div>
      ) : (
        <div className="space-y-2">
          {notices.map(notice => (
            <Link
              key={notice.id}
              to={`/notices/${notice.id}`}
              className="card p-4 flex items-center justify-between hover:shadow-md transition group"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className={`shrink-0 text-xs font-bold px-2 py-0.5 rounded-full ${
                  notice.scope === 'GLOBAL'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-purple-100 text-purple-700'
                }`}>
                  {notice.scope === 'GLOBAL' ? '전체' : '학교'}
                </span>
                <span className="font-semibold text-gray-800 truncate group-hover:text-primary-600 transition">
                  {notice.title}
                </span>
              </div>
              <span className="text-xs text-gray-400 shrink-0 ml-4">{fmtDate(notice.publishedAt)}</span>
            </Link>
          ))}
        </div>
      )}

      {/* 페이지네이션 */}
      <Pagination page={page} totalPages={totalPages} onPage={setPage} />
    </div>
  )
}

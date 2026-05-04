import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getSchoolNotices, createSchoolNotice, publishSchoolNotice, deleteSchoolNotice } from '../api/notices'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../components/Toast'

function fmtDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
}

const STATUS_LABEL = { DRAFT: '초안', PUBLISHED: '등록됨' }
const STATUS_COLOR = { DRAFT: 'bg-amber-100 text-amber-700', PUBLISHED: 'bg-green-100 text-green-700' }

export default function SchoolAdminNotices() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const toast = useToast()
  const schoolId = user?.schoolId
  const [form, setForm] = useState({ title: '', content: '' })
  const [showForm, setShowForm] = useState(false)

  const { data: notices = [], isLoading } = useQuery({
    queryKey: ['school-notices', schoolId],
    queryFn: () => getSchoolNotices(schoolId),
    enabled: !!schoolId,
  })

  const createMut = useMutation({
    mutationFn: (data) => createSchoolNotice(schoolId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['school-notices', schoolId] })
      setForm({ title: '', content: '' })
      setShowForm(false)
      toast('공지 초안이 생성되었습니다.', 'success')
    },
    onError: () => toast('공지 생성에 실패했습니다.', 'error'),
  })

  const publishMut = useMutation({
    mutationFn: (id) => publishSchoolNotice(schoolId, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['school-notices', schoolId] })
      qc.invalidateQueries({ queryKey: ['notices'] })
      toast('공지가 등록되었습니다.', 'success')
    },
    onError: (err) => toast(err.response?.data?.message ?? '등록에 실패했습니다.', 'error'),
  })

  const deleteMut = useMutation({
    mutationFn: (id) => deleteSchoolNotice(schoolId, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['school-notices', schoolId] })
      qc.invalidateQueries({ queryKey: ['notices'] })
      toast('공지가 삭제되었습니다.', 'success')
    },
    onError: () => toast('삭제에 실패했습니다.', 'error'),
  })

  const handleCreate = (e) => {
    e.preventDefault()
    if (!form.title.trim() || !form.content.trim()) return
    createMut.mutate(form)
  }

  if (!schoolId) {
    return <div className="card p-10 text-center text-gray-400">학교 정보가 없습니다.</div>
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-gray-900">학교 공지 관리</h1>
        <button onClick={() => setShowForm(v => !v)} className="btn-primary text-sm">
          {showForm ? '닫기' : '+ 공지 작성'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="card p-6 space-y-4">
          <h2 className="font-bold text-gray-800">새 학교 공지 작성</h2>
          <input
            className="input w-full"
            placeholder="제목"
            value={form.title}
            onChange={e => setForm(v => ({ ...v, title: e.target.value }))}
          />
          <textarea
            className="input w-full min-h-[120px] resize-y"
            placeholder="내용"
            value={form.content}
            onChange={e => setForm(v => ({ ...v, content: e.target.value }))}
          />
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary text-sm">취소</button>
            <button type="submit" disabled={createMut.isPending} className="btn-primary text-sm">
              {createMut.isPending ? '저장 중…' : '초안 저장'}
            </button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => <div key={i} className="card p-5 h-16 animate-pulse bg-gray-50" />)}
        </div>
      ) : notices.length === 0 ? (
        <div className="card p-12 text-center text-gray-400">작성된 공지가 없습니다.</div>
      ) : (
        <div className="space-y-2">
          {notices.map(notice => (
            <div key={notice.id} className="card p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${STATUS_COLOR[notice.status]}`}>
                  {STATUS_LABEL[notice.status]}
                </span>
                <span className="font-semibold text-gray-800 truncate">{notice.title}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-gray-400">{fmtDate(notice.createdAt)}</span>
                {notice.status === 'DRAFT' && (
                  <button
                    onClick={() => publishMut.mutate(notice.id)}
                    disabled={publishMut.isPending}
                    className="btn-primary text-xs px-3 py-1"
                  >
                    등록
                  </button>
                )}
                <button
                  onClick={() => {
                    if (window.confirm('공지를 삭제하시겠습니까?')) deleteMut.mutate(notice.id)
                  }}
                  disabled={deleteMut.isPending}
                  className="text-xs px-3 py-1 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition"
                >
                  삭제
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

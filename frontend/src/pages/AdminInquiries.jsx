import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getAdminInquiries, answerInquiry, deleteAdminInquiry } from '../api/inquiries'
import { useToast } from '../components/Toast'

function fmtDateTime(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const STATUS_CONFIG = {
  PENDING:  { label: '답변 대기', color: 'bg-amber-100 text-amber-600' },
  ANSWERED: { label: '답변 완료', color: 'bg-emerald-100 text-emerald-700' },
}

function ReplyModal({ inquiry, onClose }) {
  const toast = useToast()
  const queryClient = useQueryClient()
  const [reply, setReply] = useState(inquiry.adminReply || '')

  const mutation = useMutation({
    mutationFn: answerInquiry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-inquiries'] })
      toast('답변이 등록되었습니다.', 'success')
      onClose()
    },
    onError: (err) => toast(err.response?.data?.message || '답변 등록에 실패했습니다.', 'error'),
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <span className="font-bold text-gray-900">답변 작성</span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-5 py-4">
          {/* 원문 */}
          <div className="bg-gray-50 rounded-xl px-4 py-3 mb-4">
            <p className="text-xs font-semibold text-gray-500 mb-1">문의 내용</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{inquiry.body}</p>
            <p className="text-xs text-gray-400 mt-2">{inquiry.user?.name} · {inquiry.user?.email}</p>
          </div>

          <textarea
            value={reply}
            onChange={e => setReply(e.target.value)}
            placeholder="답변을 입력해주세요."
            maxLength={2000}
            rows={6}
            className="w-full text-sm border border-gray-200 rounded-xl px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-primary-400 placeholder:text-gray-300"
          />
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-gray-400">{reply.length} / 2000</span>
            <div className="flex gap-2">
              <button onClick={onClose} className="btn-secondary text-sm px-4 py-2 rounded-xl">취소</button>
              <button
                onClick={() => mutation.mutate({ id: inquiry.id, adminReply: reply })}
                disabled={mutation.isPending || reply.trim().length === 0}
                className="btn-primary text-sm px-5 py-2 rounded-xl disabled:opacity-50"
              >
                {mutation.isPending ? '저장 중...' : '답변 저장'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AdminInquiries() {
  const toast = useToast()
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState('')
  const [replyTarget, setReplyTarget] = useState(null)

  const { data: inquiries = [], isLoading } = useQuery({
    queryKey: ['admin-inquiries', statusFilter],
    queryFn: () => getAdminInquiries(statusFilter || undefined),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteAdminInquiry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-inquiries'] })
      toast('문의가 삭제되었습니다.', 'success')
    },
    onError: (err) => toast(err.response?.data?.message || '삭제에 실패했습니다.', 'error'),
  })

  const pending = inquiries.filter(i => i.status === 'PENDING').length

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <Link
        to="/admin"
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6 transition"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        운영자 대시보드
      </Link>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">1:1 문의 관리</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {pending > 0
              ? <span>답변 대기 <span className="text-amber-500 font-semibold">{pending}건</span></span>
              : '미답변 문의가 없습니다.'}
          </p>
        </div>

        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-400"
        >
          <option value="">전체</option>
          <option value="PENDING">답변 대기</option>
          <option value="ANSWERED">답변 완료</option>
        </select>
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-primary-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : inquiries.length === 0 ? (
          <div className="py-16 text-center text-sm text-gray-400">문의가 없습니다.</div>
        ) : (
          <ul className="divide-y divide-gray-50">
            {inquiries.map(inq => {
              const cfg = STATUS_CONFIG[inq.status]
              return (
                <li key={inq.id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.color}`}>
                          {cfg.label}
                        </span>
                        <span className="text-xs text-gray-400">{fmtDateTime(inq.createdAt)}</span>
                      </div>
                      <p className="text-sm text-gray-800 whitespace-pre-wrap line-clamp-3">{inq.body}</p>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <span className="text-xs text-gray-500 font-medium">{inq.user?.name}</span>
                        <span className="text-xs text-gray-300">·</span>
                        <span className="text-xs text-gray-400">{inq.user?.email}</span>
                        {inq.user?.school && (
                          <>
                            <span className="text-xs text-gray-300">·</span>
                            <span className="text-xs text-gray-400">{inq.user.school.name}</span>
                          </>
                        )}
                      </div>
                      {inq.adminReply && (
                        <div className="mt-3 bg-emerald-50 rounded-xl px-4 py-3">
                          <p className="text-xs font-semibold text-emerald-700 mb-1">답변 · {fmtDateTime(inq.repliedAt)}</p>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap line-clamp-2">{inq.adminReply}</p>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => setReplyTarget(inq)}
                        className="text-xs font-medium text-primary-600 hover:underline"
                      >
                        {inq.status === 'ANSWERED' ? '수정' : '답변'}
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm('문의를 삭제하시겠습니까?')) deleteMutation.mutate(inq.id)
                        }}
                        disabled={deleteMutation.isPending}
                        className="text-xs text-gray-400 hover:text-red-500 transition"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {replyTarget && <ReplyModal inquiry={replyTarget} onClose={() => setReplyTarget(null)} />}
    </div>
  )
}

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createInquiry, getMyInquiries, deleteMyInquiry } from '../api/inquiries'
import { useToast } from './Toast'

function fmtDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
}

const STATUS_CONFIG = {
  PENDING:  { label: '답변 대기', color: 'bg-amber-100 text-amber-600' },
  ANSWERED: { label: '답변 완료', color: 'bg-emerald-100 text-emerald-700' },
}

export default function InquiryModal({ onClose }) {
  const toast = useToast()
  const queryClient = useQueryClient()
  const [tab, setTab] = useState('list')
  const [body, setBody] = useState('')

  const { data: inquiries = [], isLoading } = useQuery({
    queryKey: ['my-inquiries'],
    queryFn: getMyInquiries,
  })

  const createMutation = useMutation({
    mutationFn: createInquiry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-inquiries'] })
      toast('문의가 접수되었습니다.', 'success')
      setBody('')
      setTab('list')
    },
    onError: (err) => toast(err.response?.data?.message || '문의 전송에 실패했습니다.', 'error'),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteMyInquiry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-inquiries'] })
      toast('문의가 삭제되었습니다.', 'success')
    },
    onError: (err) => toast(err.response?.data?.message || '삭제에 실패했습니다.', 'error'),
  })

  const answeredCount = inquiries.filter(i => i.status === 'ANSWERED').length

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <span className="font-bold text-gray-900">1:1 문의</span>
            {answeredCount > 0 && (
              <span className="text-xs font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                답변 {answeredCount}건
              </span>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 탭 */}
        <div className="flex border-b border-gray-100">
          {[
            { key: 'list', label: '내 문의 내역' },
            { key: 'new', label: '새 문의 작성' },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 py-3 text-sm font-semibold transition ${
                tab === t.key
                  ? 'text-primary-600 border-b-2 border-primary-600'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* 내용 */}
        <div className="max-h-[60vh] overflow-y-auto">
          {tab === 'list' ? (
            isLoading ? (
              <div className="flex justify-center py-12">
                <div className="w-7 h-7 border-4 border-primary-400 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : inquiries.length === 0 ? (
              <div className="py-16 text-center text-sm text-gray-400">
                <p>문의 내역이 없습니다.</p>
                <button
                  onClick={() => setTab('new')}
                  className="mt-3 text-primary-600 font-semibold hover:underline text-sm"
                >
                  첫 문의 작성하기 →
                </button>
              </div>
            ) : (
              <ul className="divide-y divide-gray-50">
                {inquiries.map(inq => {
                  const cfg = STATUS_CONFIG[inq.status]
                  return (
                    <li key={inq.id} className="px-5 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.color}`}>
                              {cfg.label}
                            </span>
                            <span className="text-xs text-gray-400">{fmtDate(inq.createdAt)}</span>
                          </div>
                          <p className="text-sm text-gray-800 whitespace-pre-wrap">{inq.body}</p>
                          {inq.adminReply && (
                            <div className="mt-3 bg-emerald-50 rounded-xl px-4 py-3">
                              <p className="text-xs font-semibold text-emerald-700 mb-1">운영자 답변</p>
                              <p className="text-sm text-gray-700 whitespace-pre-wrap">{inq.adminReply}</p>
                              {inq.repliedAt && (
                                <p className="text-xs text-gray-400 mt-1">{fmtDate(inq.repliedAt)}</p>
                              )}
                            </div>
                          )}
                        </div>
                        {inq.status === 'PENDING' && (
                          <button
                            onClick={() => deleteMutation.mutate(inq.id)}
                            disabled={deleteMutation.isPending}
                            className="text-xs text-gray-400 hover:text-red-500 transition shrink-0 mt-0.5"
                          >
                            삭제
                          </button>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            )
          ) : (
            <div className="px-5 py-5">
              <p className="text-xs text-gray-400 mb-3">운영자가 확인 후 답변드립니다. (최대 1000자)</p>
              <textarea
                value={body}
                onChange={e => setBody(e.target.value)}
                placeholder="문의 내용을 입력해주세요."
                maxLength={1000}
                rows={6}
                className="w-full text-sm border border-gray-200 rounded-xl px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-primary-400 placeholder:text-gray-300"
              />
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-gray-400">{body.length} / 1000</span>
                <button
                  onClick={() => createMutation.mutate(body)}
                  disabled={createMutation.isPending || body.trim().length === 0}
                  className="btn-primary text-sm px-5 py-2 rounded-xl disabled:opacity-50"
                >
                  {createMutation.isPending ? '전송 중...' : '문의 접수'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getMyCertRequests, submitCertRequest, cancelCertRequest } from '../api/certRequests'
import { useToast } from './Toast'

const STATUS_CONFIG = {
  PENDING:  { label: '검토 중',  color: 'bg-amber-100 text-amber-700' },
  APPROVED: { label: '승인됨',   color: 'bg-green-100 text-green-700' },
  REJECTED: { label: '거절됨',   color: 'bg-red-100 text-red-500' },
}

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' })
}

export default function CertRequestModal({ onClose }) {
  const toast = useToast()
  const queryClient = useQueryClient()
  const [tab, setTab] = useState('status')
  const [message, setMessage] = useState('')

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['my-cert-requests'],
    queryFn: getMyCertRequests,
  })

  const latestPending = requests.find(r => r.status === 'PENDING')
  const hasEverApplied = requests.length > 0

  const submitMutation = useMutation({
    mutationFn: () => submitCertRequest(message),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-cert-requests'] })
      toast('신청이 완료되었습니다.', 'success')
      setMessage('')
      setTab('status')
    },
    onError: (err) => toast(err.response?.data?.message || '신청에 실패했습니다.', 'error'),
  })

  const cancelMutation = useMutation({
    mutationFn: (id) => cancelCertRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-cert-requests'] })
      toast('신청이 취소되었습니다.', 'success')
    },
    onError: (err) => toast(err.response?.data?.message || '취소에 실패했습니다.', 'error'),
  })

  const canApply = !latestPending

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-bold text-gray-900">인증주최자 신청</h2>
            <p className="text-xs text-gray-400 mt-0.5">승인 시 행사를 만들 수 있습니다</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 탭 */}
        <div className="flex border-b border-gray-100">
          {[
            { value: 'status', label: '신청 현황' },
            { value: 'new', label: '새 신청' },
          ].map(t => (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={`flex-1 py-3 text-sm font-semibold transition border-b-2 -mb-px ${
                tab === t.value
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-5 max-h-[60vh] overflow-y-auto">
          {/* 신청 현황 탭 */}
          {tab === 'status' && (
            <>
              {isLoading ? (
                <div className="text-center py-8 text-gray-400 text-sm">불러오는 중...</div>
              ) : requests.length === 0 ? (
                <div className="text-center py-8 space-y-2">
                  <p className="text-gray-400 text-sm">신청 내역이 없습니다.</p>
                  <button
                    onClick={() => setTab('new')}
                    className="text-primary-600 text-sm font-semibold hover:underline"
                  >
                    신청하기 →
                  </button>
                </div>
              ) : (
                <ul className="space-y-3">
                  {requests.map(r => {
                    const cfg = STATUS_CONFIG[r.status]
                    return (
                      <li key={r.id} className="border border-gray-100 rounded-xl p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.color}`}>
                            {cfg.label}
                          </span>
                          <span className="text-xs text-gray-400">{fmtDate(r.createdAt)}</span>
                        </div>
                        {r.message && (
                          <p className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">{r.message}</p>
                        )}
                        {r.reviewNote && (
                          <div className={`text-sm rounded-lg px-3 py-2 ${
                            r.status === 'APPROVED' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
                          }`}>
                            <span className="font-medium">{r.status === 'APPROVED' ? '승인 메모' : '거절 사유'}: </span>
                            {r.reviewNote}
                          </div>
                        )}
                        {r.status === 'PENDING' && (
                          <button
                            onClick={() => cancelMutation.mutate(r.id)}
                            disabled={cancelMutation.isPending}
                            className="text-xs text-red-500 hover:text-red-700 hover:underline disabled:opacity-50"
                          >
                            {cancelMutation.isPending ? '취소 중...' : '신청 취소'}
                          </button>
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}
            </>
          )}

          {/* 새 신청 탭 */}
          {tab === 'new' && (
            <>
              {latestPending ? (
                <div className="text-center py-8 space-y-2">
                  <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-sm font-semibold text-gray-700">이미 처리 중인 신청이 있습니다</p>
                  <p className="text-xs text-gray-400">학교 관리자가 검토 중입니다.</p>
                  <button onClick={() => setTab('status')} className="text-primary-600 text-sm font-semibold hover:underline">
                    신청 현황 보기 →
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-blue-50 rounded-xl p-3 text-xs text-blue-700 space-y-1">
                    <p className="font-semibold">인증주최자 신청 안내</p>
                    <p>승인 후 직접 행사를 만들고 참가자를 모집할 수 있습니다.</p>
                    <p>신청 검토는 소속 학교 관리자가 진행합니다.</p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-gray-700">
                      신청 사유 <span className="text-gray-400 font-normal">(선택)</span>
                    </label>
                    <textarea
                      value={message}
                      onChange={e => setMessage(e.target.value)}
                      placeholder="예) 동아리 연합 행사 주최 예정, 학생회 행사 기획 등"
                      rows={4}
                      maxLength={300}
                      className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-primary-400 placeholder:text-gray-300"
                    />
                    <p className="text-xs text-gray-400 text-right">{message.length}/300</p>
                  </div>

                  <button
                    onClick={() => submitMutation.mutate()}
                    disabled={submitMutation.isPending}
                    className="btn-primary w-full justify-center"
                  >
                    {submitMutation.isPending ? '신청 중...' : '인증주최자 신청하기'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

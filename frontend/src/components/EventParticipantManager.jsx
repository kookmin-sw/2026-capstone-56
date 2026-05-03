import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getEventRegistrations, approveRefund } from '../api/events'

const STATUS_CONFIG = {
  PENDING_PAYMENT:        { label: '결제 대기',    color: 'bg-amber-100 text-amber-700' },
  CONFIRMED:              { label: '신청 완료',    color: 'bg-green-100 text-green-700' },
  CANCELLATION_REQUESTED: { label: '환불 처리 중', color: 'bg-blue-100 text-blue-700' },
  REFUND_FAILED:          { label: '환불 실패',    color: 'bg-red-100 text-red-500' },
  CANCELLED:              { label: '취소됨',       color: 'bg-gray-100 text-gray-500' },
  EXPIRED:                { label: '만료됨',       color: 'bg-gray-100 text-gray-400' },
  CHECKED_IN:             { label: '입장 완료',    color: 'bg-purple-100 text-purple-700' },
}

function fmtDateShort(iso) {
  if (!iso) return '-'
  return new Date(iso).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function EventParticipantManager({ eventId, event }) {
  const [isOpen, setIsOpen] = useState(false)
  const [refundTarget, setRefundTarget] = useState(null)
  const [refundReason, setRefundReason] = useState('')
  const queryClient = useQueryClient()

  const { data: registrations = [], isLoading } = useQuery({
    queryKey: ['event-registrations', eventId],
    queryFn: () => getEventRegistrations(eventId),
    enabled: isOpen,
  })

  const refundMutation = useMutation({
    mutationFn: () => approveRefund(eventId, refundTarget.id, refundReason),
    onSuccess: (res) => {
      alert(res.message)
      setRefundTarget(null)
      setRefundReason('')
      queryClient.invalidateQueries({ queryKey: ['event-registrations', eventId] })
    },
    onError: (err) => alert(err.response?.data?.message ?? '환불 처리에 실패했습니다.'),
  })

  const activeCount = registrations.filter(r =>
    ['CONFIRMED', 'CHECKED_IN', 'CANCELLATION_REQUESTED', 'REFUND_FAILED'].includes(r.status)
  ).length

  return (
    <div className="border border-gray-100 rounded-2xl overflow-hidden">
      {/* 헤더 토글 */}
      <button
        type="button"
        onClick={() => setIsOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="text-sm font-semibold text-gray-800">참여자 관리</span>
          {registrations.length > 0 && (
            <span className="text-xs text-gray-500">
              ({activeCount}/{registrations.length}명 활성)
            </span>
          )}
        </div>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* 내용 */}
      {isOpen && (
        <div className="p-4">
          {isLoading ? (
            <p className="text-sm text-gray-400 text-center py-4">불러오는 중...</p>
          ) : registrations.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">신청자가 없습니다.</p>
          ) : (
            <div className="border border-gray-100 rounded-xl overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500">
                  <tr>
                    <th className="text-left px-3 py-2">이름</th>
                    <th className="text-left px-3 py-2">학번</th>
                    <th className="text-left px-3 py-2">상태</th>
                    <th className="text-left px-3 py-2">신청일</th>
                    {event.isPaid && <th className="text-left px-3 py-2">결제금액</th>}
                    {event.isPaid && <th className="px-3 py-2"></th>}
                  </tr>
                </thead>
                <tbody>
                  {registrations.map((reg) => {
                    const cfg = STATUS_CONFIG[reg.status] ?? { label: reg.status, color: 'bg-gray-100 text-gray-500' }
                    const canRefund = event.isPaid &&
                      ['CONFIRMED', 'REFUND_FAILED'].includes(reg.status) &&
                      reg.paymentKey
                    return (
                      <tr key={reg.id} className="border-t border-gray-50 hover:bg-gray-50/50">
                        <td className="px-3 py-2.5">
                          <div className="font-medium text-gray-800">{reg.user.name}</div>
                          <div className="text-xs text-gray-400">{reg.user.email}</div>
                        </td>
                        <td className="px-3 py-2.5 text-gray-500 font-mono text-xs">
                          {reg.user.studentId ?? '-'}
                        </td>
                        <td className="px-3 py-2.5">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.color}`}>
                            {cfg.label}
                          </span>
                          {reg.checkedInAt && (
                            <div className="text-[10px] text-purple-500 mt-0.5">
                              {fmtDateShort(reg.checkedInAt)} 입장
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-gray-400 text-xs">
                          {fmtDateShort(reg.createdAt)}
                        </td>
                        {event.isPaid && (
                          <td className="px-3 py-2.5 text-gray-600 text-xs">
                            {reg.paidAmount != null ? `${reg.paidAmount.toLocaleString()}원` : '-'}
                          </td>
                        )}
                        {event.isPaid && (
                          <td className="px-3 py-2.5 text-right">
                            {canRefund && (
                              <button
                                onClick={() => { setRefundTarget(reg); setRefundReason('') }}
                                className="text-xs text-red-500 hover:text-red-700 font-semibold border border-red-200 hover:border-red-300 px-2 py-1 rounded-lg transition-colors"
                              >
                                환불 승인
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 환불 모달 */}
      {refundTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-900">환불 승인</h3>

            <div className="bg-gray-50 rounded-2xl p-3 space-y-1">
              <div className="text-sm font-semibold text-gray-800">{refundTarget.user.name}</div>
              <div className="text-xs text-gray-500">{refundTarget.user.email}</div>
              {refundTarget.paidAmount != null && (
                <div className="text-xs text-gray-500">결제금액: {refundTarget.paidAmount.toLocaleString()}원</div>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                환불 사유 <span className="text-red-400">*</span>
              </label>
              <textarea
                className="input min-h-[80px] resize-none text-sm"
                placeholder="환불 사유를 입력해주세요 (BR-45 필수 기록)"
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setRefundTarget(null); setRefundReason('') }}
                className="btn flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-2xl text-sm"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!refundReason.trim()) return alert('환불 사유를 입력해주세요.')
                  refundMutation.mutate()
                }}
                disabled={refundMutation.isPending}
                className="btn flex-1 bg-red-500 hover:bg-red-600 text-white py-2.5 rounded-2xl text-sm font-semibold disabled:opacity-60"
              >
                {refundMutation.isPending ? '처리 중...' : '환불 확정'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

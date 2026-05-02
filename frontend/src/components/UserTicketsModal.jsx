import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useToast } from './Toast'

function fmtDateTime(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const STATUS_CONFIG = {
  PENDING_PAYMENT:        { label: '결제 대기',    color: 'bg-yellow-100 text-yellow-700' },
  CONFIRMED:              { label: '신청 완료',    color: 'bg-green-100 text-green-700' },
  CHECKED_IN:             { label: '입장 완료',    color: 'bg-blue-100 text-blue-700' },
  CANCELLED:              { label: '취소됨',       color: 'bg-gray-100 text-gray-500' },
  EXPIRED:                { label: '만료',         color: 'bg-gray-100 text-gray-400' },
  CANCELLATION_REQUESTED: { label: '환불 처리 중', color: 'bg-orange-100 text-orange-600' },
  REFUND_FAILED:          { label: '환불 실패',    color: 'bg-red-100 text-red-500' },
}

export default function UserTicketsModal({ user, fetchFn, cancelFn, onClose }) {
  const toast = useToast()
  const queryClient = useQueryClient()

  const { data: registrations = [], isLoading } = useQuery({
    queryKey: ['user-registrations', user.id],
    queryFn: () => fetchFn(user.id),
  })

  const cancelMutation = useMutation({
    mutationFn: (registrationId) => cancelFn(registrationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-registrations', user.id] })
      toast('티켓이 취소되었습니다.', 'success')
    },
    onError: (err) => toast(err.response?.data?.message || '취소에 실패했습니다.', 'error'),
  })

  const handleCancel = (r) => {
    const label = r.event.isPaid ? '유료 티켓입니다. 환불 큐에 등록됩니다. 취소하시겠습니까?' : '티켓을 취소하시겠습니까?'
    if (!window.confirm(label)) return
    cancelMutation.mutate(r.id)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[80vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-bold text-gray-900">{user.name}님의 티켓</h2>
            <p className="text-xs text-gray-400 mt-0.5">{user.email}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 transition">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 목록 */}
        <div className="overflow-y-auto flex-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-7 h-7 border-4 border-primary-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : registrations.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-400">신청한 행사가 없습니다.</div>
          ) : (
            <ul className="divide-y divide-gray-50">
              {registrations.map(r => {
                const cfg = STATUS_CONFIG[r.status] ?? { label: r.status, color: 'bg-gray-100 text-gray-500' }
                return (
                  <li key={r.id} className="px-5 py-4 flex items-start gap-3 hover:bg-gray-50 transition">
                    {/* 상태 아이콘 */}
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold ${cfg.color}`}>
                      {r.status === 'CHECKED_IN' ? '✓' : r.status === 'CONFIRMED' ? '●' : '○'}
                    </div>

                    {/* 행사 정보 */}
                    <div className="flex-1 min-w-0">
                      <Link
                        to={`/events/${r.event.id}`}
                        onClick={onClose}
                        className="font-semibold text-gray-900 hover:text-primary-600 hover:underline line-clamp-1 text-sm"
                      >
                        {r.event.title}
                      </Link>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-xs text-gray-400">{fmtDateTime(r.event.startAt)}</span>
                        {r.event.location && <span className="text-xs text-gray-400">· {r.event.location}</span>}
                        {r.event.school && <span className="text-xs text-gray-300">· {r.event.school.name}</span>}
                      </div>
                      {r.status === 'CHECKED_IN' && r.checkedInAt && (
                        <div className="text-xs text-blue-500 mt-0.5">입장: {fmtDateTime(r.checkedInAt)}</div>
                      )}
                      {r.event.isPaid && r.paidAmount != null && (
                        <div className="text-xs text-gray-400 mt-0.5">결제: {r.paidAmount.toLocaleString()}원</div>
                      )}
                    </div>

                    {/* 상태 뱃지 + 취소 버튼 */}
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${cfg.color}`}>
                        {cfg.label}
                      </span>
                      {cancelFn && r.status === 'CONFIRMED' && (
                        <button
                          onClick={() => handleCancel(r)}
                          disabled={cancelMutation.isPending}
                          className="text-[10px] text-red-500 hover:underline disabled:opacity-50"
                        >
                          취소
                        </button>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* 푸터 */}
        <div className="px-5 py-3 border-t border-gray-100 text-xs text-gray-400 text-right">
          총 {registrations.length}건
        </div>
      </div>
    </div>
  )
}

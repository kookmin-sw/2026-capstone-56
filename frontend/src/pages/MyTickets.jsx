import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getMyRegistrations, cancelFreeRegistration } from '../api/registrations'

function fmtDateTime(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleString('ko-KR', { dateStyle: 'medium', timeStyle: 'short' })
}

const STATUS_LABEL = {
  CONFIRMED: '신청 완료',
  PENDING_PAYMENT: '결제 대기',
  CANCELLATION_REQUESTED: '취소 요청 중',
  CANCELLED: '취소됨',
  EXPIRED: '만료됨',
  REFUND_FAILED: '환불 실패',
  CHECKED_IN: '체크인 완료',
}

const STATUS_COLOR = {
  CONFIRMED: 'bg-emerald-100 text-emerald-700',
  PENDING_PAYMENT: 'bg-amber-100 text-amber-700',
  CANCELLATION_REQUESTED: 'bg-orange-100 text-orange-700',
  CANCELLED: 'bg-gray-100 text-gray-500',
  EXPIRED: 'bg-gray-100 text-gray-400',
  REFUND_FAILED: 'bg-red-100 text-red-600',
  CHECKED_IN: 'bg-blue-100 text-blue-700',
}

export default function MyTickets() {
  const queryClient = useQueryClient()

  const { data: active = [], isLoading } = useQuery({
    queryKey: ['my-registrations', false],
    queryFn: () => getMyRegistrations({ archived: false }),
  })

  const { data: archived = [] } = useQuery({
    queryKey: ['my-registrations', true],
    queryFn: () => getMyRegistrations({ archived: true }),
  })

  const cancelMutation = useMutation({
    mutationFn: (id) => cancelFreeRegistration(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-registrations'] })
    },
    onError: (err) => alert(err.response?.data?.message ?? '취소 실패'),
  })

  if (isLoading) return <div className="card p-12 text-center text-gray-400">불러오는 중...</div>

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">내 티켓</h1>

      <section>
        <h2 className="text-sm font-semibold text-gray-500 mb-3">활성 티켓</h2>
        {active.length === 0 ? (
          <div className="card p-10 text-center text-gray-400 text-sm">신청한 행사가 없습니다.</div>
        ) : (
          <div className="space-y-3">
            {active.map((reg) => (
              <TicketCard key={reg.id} reg={reg} onCancel={() => {
                if (confirm('신청을 취소하시겠습니까?')) cancelMutation.mutate(reg.id)
              }} />
            ))}
          </div>
        )}
      </section>

      {archived.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-400 mb-3">지난 티켓</h2>
          <div className="space-y-3">
            {archived.map((reg) => (
              <TicketCard key={reg.id} reg={reg} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function TicketCard({ reg, onCancel }) {
  const { event, status } = reg
  const canCancel = status === 'CONFIRMED' && !event.isPaid

  return (
    <div className="card p-5 flex items-start justify-between gap-4">
      <div className="space-y-1 flex-1 min-w-0">
        <div className="font-semibold text-gray-900 truncate">{event.title}</div>
        <div className="text-sm text-gray-500">{fmtDateTime(event.startAt)}</div>
        {event.location && <div className="text-xs text-gray-400">{event.location}</div>}
      </div>
      <div className="flex flex-col items-end gap-2 shrink-0">
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_COLOR[status]}`}>
          {STATUS_LABEL[status] ?? status}
        </span>
        {canCancel && onCancel && (
          <button onClick={onCancel} className="text-xs text-red-400 hover:text-red-600">
            취소
          </button>
        )}
      </div>
    </div>
  )
}

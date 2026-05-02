import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getMyRegistrations, cancelFreeRegistration } from '../api/registrations'

function fmtDateTime(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleString('ko-KR', { dateStyle: 'medium', timeStyle: 'short' })
}

const STATUS_LABEL = {
  PENDING_PAYMENT: '결제 대기',
  CONFIRMED: '신청 완료',
  CANCELLED: '취소됨',
  EXPIRED: '만료',
  CHECKED_IN: '입장 완료',
  REFUND_FAILED: '환불 실패',
  CANCELLATION_REQUESTED: '환불 처리 중',
}

export default function MyTickets() {
  const [tab, setTab] = useState('active')
  const queryClient = useQueryClient()

  const { data: regs = [], isLoading } = useQuery({
    queryKey: ['my-registrations', tab],
    queryFn: () => getMyRegistrations({ archived: tab === 'archived' }),
  })

  const cancelMutation = useMutation({
    mutationFn: cancelFreeRegistration,
    onSuccess: () => {
      alert('취소되었습니다.')
      queryClient.invalidateQueries({ queryKey: ['my-registrations'] })
    },
    onError: (err) => alert(err.response?.data?.message ?? '취소 실패'),
  })

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">내 티켓</h1>

      <div className="flex gap-2">
        <TabButton active={tab === 'active'} onClick={() => setTab('active')}>활성</TabButton>
        <TabButton active={tab === 'archived'} onClick={() => setTab('archived')}>지난 신청</TabButton>
      </div>

      {isLoading ? (
        <div className="card p-12 text-center text-gray-500">불러오는 중...</div>
      ) : regs.length === 0 ? (
        <div className="card p-12 text-center text-gray-500">표시할 신청이 없습니다.</div>
      ) : (
        <ul className="space-y-3">
          {regs.map(r => (
            <li key={r.id} className="card p-5 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <Link to={`/events/${r.event.id}`} className="font-semibold text-gray-900 hover:underline line-clamp-1">
                  {r.event.title}
                </Link>
                <div className="text-sm text-gray-500 mt-1">📍 {r.event.location ?? '-'}</div>
                <div className="text-sm text-gray-500">🕒 {fmtDateTime(r.event.startAt)}</div>
                <div className="text-xs text-gray-400 mt-2">
                  상태: <span className="font-semibold text-gray-700">{STATUS_LABEL[r.status] ?? r.status}</span>
                  {r.event.isPaid && r.event.refundDeadlineAt && (
                    <span className="ml-2">· 환불 마감 {fmtDateTime(r.event.refundDeadlineAt)}</span>
                  )}
                </div>
                {r.event.refundContact && (
                  <div className="text-xs text-gray-400">문의: {r.event.refundContact}</div>
                )}
              </div>
              {tab === 'active' && r.status === 'CONFIRMED' && !r.event.isPaid && (
                <button
                  onClick={() => {
                    if (confirm('신청을 취소하시겠습니까?')) cancelMutation.mutate(r.id)
                  }}
                  className="btn shrink-0 border border-red-200 text-red-600 hover:bg-red-50 text-sm"
                >
                  취소
                </button>
              )}
            </li>
          ))}
        </ul>
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

function TabButton({ active, children, ...rest }) {
  return (
    <button
      {...rest}
      className={`px-4 py-2 rounded-2xl text-sm font-semibold transition-all ${
        active ? 'bg-primary-600 text-white shadow-sm' : 'bg-white text-gray-600 border border-gray-100'
      }`}
    >
      {children}
    </button>
  )
}

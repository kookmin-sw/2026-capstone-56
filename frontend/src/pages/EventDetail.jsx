import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getEvent } from '../api/events'
import { createFreeRegistration, cancelFreeRegistration } from '../api/registrations'
import { useAuth } from '../hooks/useAuth'

function fmtDateTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleString('ko-KR', { dateStyle: 'medium', timeStyle: 'short' })
}

export default function EventDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuth()

  const { data: event, isLoading, isError, error } = useQuery({
    queryKey: ['event', id],
    queryFn: () => getEvent(id),
  })

  const applyMutation = useMutation({
    mutationFn: () => createFreeRegistration(id),
    onSuccess: (res) => {
      alert(`신청이 완료되었습니다.\n\n[안내]\n${res.notice?.channels ?? ''}\n${res.notice?.refundInfo ?? ''}`)
      queryClient.invalidateQueries({ queryKey: ['event', id] })
      queryClient.invalidateQueries({ queryKey: ['my-registrations'] })
    },
    onError: (err) => {
      alert(err.response?.data?.message ?? '신청에 실패했습니다.')
    },
  })

  const cancelMutation = useMutation({
    mutationFn: (regId) => cancelFreeRegistration(regId),
    onSuccess: () => {
      alert('신청이 취소되었습니다.')
      queryClient.invalidateQueries({ queryKey: ['event', id] })
      queryClient.invalidateQueries({ queryKey: ['my-registrations'] })
    },
    onError: (err) => {
      alert(err.response?.data?.message ?? '취소에 실패했습니다.')
    },
  })

  if (isLoading) return <div className="card p-12 text-center text-gray-500">불러오는 중...</div>
  if (isError) return <div className="card p-12 text-center text-red-500">{error?.response?.data?.message ?? '행사를 불러올 수 없습니다.'}</div>
  if (!event) return null

  const activeCount = event._count?.registrations ?? 0
  const remaining = event.capacity - activeCount
  const isFull = remaining <= 0
  const myReg = event.myRegistration

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link to="/" className="text-sm text-gray-500 hover:underline">← 목록으로</Link>

      <div className="card p-8 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl font-bold text-gray-900">{event.title}</h1>
          <span className={`text-xs font-bold px-3 py-1 rounded-full ${event.isPaid ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'}`}>
            {event.isPaid ? `${event.price?.toLocaleString()}원` : '무료'}
          </span>
        </div>

        <div className="text-sm text-gray-600 space-y-1">
          <div>📍 {event.location ?? '장소 미정'}</div>
          <div>🕒 {fmtDateTime(event.startAt)} ~ {fmtDateTime(event.endAt)}</div>
          {event.registrationDeadline && <div>📝 신청 마감: {fmtDateTime(event.registrationDeadline)}</div>}
          <div>👥 정원 {event.capacity}명 · 잔여 {Math.max(0, remaining)}석</div>
          <div>🏫 {event.school?.name}</div>
          <div>🙋 호스트: {event.hostNameSnapshot ?? event.host?.name}</div>
        </div>

        {event.description && (
          <div className="prose-sm bg-gray-50 rounded-2xl p-4 whitespace-pre-wrap text-gray-700">
            {event.description}
          </div>
        )}

        {/* 환불 정책 (유료 행사만) */}
        {event.isPaid && (event.refundDeadlineAt || event.refundContact || event.refundPolicyText) && (
          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-sm space-y-1">
            <div className="font-semibold text-amber-800">환불 정책</div>
            {event.refundDeadlineAt && <div>환불 마감: {fmtDateTime(event.refundDeadlineAt)}까지 본인 환불 가능</div>}
            {event.refundPolicyText && <div className="text-gray-700 whitespace-pre-wrap">{event.refundPolicyText}</div>}
            {event.refundContact && <div className="text-gray-700">환불 마감 이후 문의: {event.refundContact}</div>}
          </div>
        )}

        {/* 신청/취소 액션 */}
        <div className="border-t pt-4">
          {!user ? (
            <button onClick={() => navigate('/login')} className="btn btn-primary w-full">로그인 후 신청</button>
          ) : myReg ? (
            <div className="space-y-2">
              <div className="text-sm text-gray-600">현재 상태: <span className="font-semibold">{myReg.status}</span></div>
              {!event.isPaid && myReg.status === 'CONFIRMED' && (
                <button
                  onClick={() => {
                    if (confirm('신청을 취소하시겠습니까?')) cancelMutation.mutate(myReg.id)
                  }}
                  disabled={cancelMutation.isPending}
                  className="btn w-full border border-red-200 text-red-600 hover:bg-red-50"
                >
                  신청 취소
                </button>
              )}
            </div>
          ) : event.status !== 'PUBLISHED' ? (
            <div className="text-center text-gray-500 text-sm">신청 가능한 상태가 아닙니다.</div>
          ) : isFull ? (
            <div className="text-center text-red-500 text-sm font-medium">정원이 마감되었습니다.</div>
          ) : event.isPaid ? (
            <button className="btn btn-primary w-full" disabled>
              유료 결제 신청 (결제 도메인 연동 예정)
            </button>
          ) : (
            <button
              onClick={() => applyMutation.mutate()}
              disabled={applyMutation.isPending}
              className="btn btn-primary w-full"
            >
              {applyMutation.isPending ? '신청 중...' : '신청하기'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

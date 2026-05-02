import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getEvent, publishEvent } from '../api/events'
import { createFreeRegistration, cancelFreeRegistration } from '../api/registrations'
import { useAuth } from '../hooks/useAuth'
import EventWhitelistManager from '../components/EventWhitelistManager'

// ── 날짜 포맷 ────────────────────────────────────────────────────────────────
function fmtDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
  })
}
function fmtTime(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
}

// ── 신청 상태 표시 ────────────────────────────────────────────────────────────
const STATUS_LABEL = {
  CONFIRMED: '신청 완료',
  PENDING_PAYMENT: '결제 대기',
  CANCELLATION_REQUESTED: '취소 처리 중',
  REFUND_FAILED: '환불 실패',
  CHECKED_IN: '입장 완료',
}

// ── 우측 신청 카드 ────────────────────────────────────────────────────────────
function RegistrationCard({ event, user, myReg, activeCount, navigate, applyMutation, cancelMutation }) {
  const remaining = event.capacity - activeCount
  const isFull = remaining <= 0
  const ratio = Math.min(100, Math.round((activeCount / event.capacity) * 100))

  return (
    <div className="bg-white rounded-3xl shadow-card p-5 space-y-4">
      {/* 가격 */}
      <div className="text-2xl font-black text-gray-900">
        {event.isPaid ? `${event.price?.toLocaleString()}원` : '무료'}
      </div>

      {/* 신청 현황 */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">신청 현황</span>
          <span className={`text-sm font-bold ${isFull ? 'text-red-500' : 'text-emerald-500'}`}>
            {isFull ? '마감' : `잔여 ${remaining}석`}
          </span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-primary-600 transition-all duration-500"
            style={{ width: `${ratio}%` }}
          />
        </div>
        <div className="text-xs text-gray-400">{activeCount}/{event.capacity}명 신청</div>
      </div>

      {/* 신청 버튼 */}
      <div className="space-y-2">
        {!user ? (
          <button
            onClick={() => navigate('/login')}
            className="btn btn-primary w-full py-3.5 rounded-2xl text-base font-bold"
          >
            로그인 후 신청하기
          </button>
        ) : myReg ? (
          <>
            <div className="py-2.5 text-center bg-gray-50 rounded-2xl text-sm">
              <span className="text-gray-500">신청 상태: </span>
              <span className="font-bold text-gray-800">{STATUS_LABEL[myReg.status] ?? myReg.status}</span>
            </div>
            {!event.isPaid && myReg.status === 'CONFIRMED' && (
              <button
                onClick={() => { if (confirm('신청을 취소하시겠습니까?')) cancelMutation.mutate(myReg.id) }}
                disabled={cancelMutation.isPending}
                className="btn w-full py-2.5 rounded-2xl border border-red-200 text-red-500 text-sm hover:bg-red-50 transition"
              >
                신청 취소
              </button>
            )}
          </>
        ) : event.status !== 'PUBLISHED' ? (
          <button disabled className="btn w-full py-3.5 rounded-2xl bg-gray-100 text-gray-400 text-base cursor-not-allowed">
            신청 불가
          </button>
        ) : isFull ? (
          <button disabled className="btn w-full py-3.5 rounded-2xl bg-gray-100 text-gray-500 text-base cursor-not-allowed">
            정원 마감
          </button>
        ) : event.isPaid ? (
          <button disabled className="btn btn-primary w-full py-3.5 rounded-2xl text-base font-bold opacity-50 cursor-not-allowed">
            유료 결제 신청 (준비 중)
          </button>
        ) : (
          <button
            onClick={() => applyMutation.mutate()}
            disabled={applyMutation.isPending}
            className="btn btn-primary w-full py-3.5 rounded-2xl text-base font-bold"
          >
            {applyMutation.isPending ? '신청 중...' : '지금 신청하기'}
          </button>
        )}
      </div>

      <p className="text-[11px] text-center text-gray-400">신청 후 이메일로 QR 티켓이 발송됩니다</p>
    </div>
  )
}

// ── 메인 페이지 ───────────────────────────────────────────────────────────────
export default function EventDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const [copied, setCopied] = useState(false)

  const { data: event, isLoading, isError, error } = useQuery({
    queryKey: ['event', id],
    queryFn: () => getEvent(id),
  })

  const applyMutation = useMutation({
    mutationFn: () => createFreeRegistration(id),
    onSuccess: (res) => {
      alert(`신청이 완료되었습니다.\n\n${res.notice?.channels ?? ''}`)
      queryClient.invalidateQueries({ queryKey: ['event', id] })
      queryClient.invalidateQueries({ queryKey: ['my-registrations'] })
    },
    onError: (err) => alert(err.response?.data?.message ?? '신청에 실패했습니다.'),
  })

  const cancelMutation = useMutation({
    mutationFn: (regId) => cancelFreeRegistration(regId),
    onSuccess: () => {
      alert('신청이 취소되었습니다.')
      queryClient.invalidateQueries({ queryKey: ['event', id] })
      queryClient.invalidateQueries({ queryKey: ['my-registrations'] })
    },
    onError: (err) => alert(err.response?.data?.message ?? '취소에 실패했습니다.'),
  })

  const publishMutation = useMutation({
    mutationFn: () => publishEvent(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['event', id] }),
    onError: (err) => alert(err.response?.data?.message ?? '공개에 실패했습니다.'),
  })

  const copyLink = async () => {
    await navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="w-full h-56 rounded-3xl bg-gray-100 animate-pulse mb-6" />
        <div className="h-7 bg-gray-100 rounded-full w-1/2 animate-pulse mb-3" />
        <div className="h-4 bg-gray-100 rounded-full w-1/4 animate-pulse" />
      </div>
    )
  }
  if (isError) {
    return (
      <div className="max-w-3xl mx-auto py-20 text-center text-gray-400">
        {error?.response?.data?.message ?? '행사를 불러올 수 없습니다.'}
      </div>
    )
  }
  if (!event) return null

  const activeCount = event._count?.registrations ?? 0
  const myReg = event.myRegistration
  const isHost = user && (user.id === event.host?.id || user.role === 'SCHOOL_ADMIN' || user.role === 'OPERATOR')

  return (
    <div className="max-w-3xl mx-auto">

      {/* ── 히어로 이미지 ── */}
      <div className="relative mb-6">
        <div className="w-full h-56 rounded-3xl overflow-hidden bg-gradient-to-br from-indigo-100 via-purple-50 to-indigo-100">
          {event.imageUrl ? (
            <img src={event.imageUrl} alt={event.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <svg className="w-16 h-16 text-indigo-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
        </div>

        {/* 뒤로 버튼 */}
        <button
          onClick={() => navigate(-1)}
          className="absolute top-3.5 left-3.5 w-9 h-9 bg-white/90 backdrop-blur-sm rounded-full shadow-sm flex items-center justify-center text-gray-700 hover:bg-white transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* 좋아요 버튼 */}
        <button className="absolute top-3.5 right-3.5 w-9 h-9 bg-white/90 backdrop-blur-sm rounded-full shadow-sm flex items-center justify-center text-gray-300 hover:text-red-400 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </button>
      </div>

      {/* ── 본문 2컬럼 ── */}
      <div className="flex gap-5 items-start">

        {/* 왼쪽: 정보 */}
        <div className="flex-1 min-w-0 space-y-4">

          {/* 제목 + 주최자 */}
          <div>
            <h1 className="text-2xl font-black text-gray-900 leading-tight">{event.title}</h1>
            <p className="text-sm text-gray-400 mt-1.5">
              주최: {event.hostNameSnapshot ?? event.host?.name}
            </p>
          </div>

          {/* 공유 버튼 */}
          <div className="flex gap-2">
            <button
              onClick={copyLink}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              {copied ? '복사됨!' : '링크 복사'}
            </button>
            <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#FEE500] hover:bg-yellow-400 text-sm font-bold text-gray-900 transition-colors">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 3C6.477 3 2 6.477 2 10.5c0 2.485 1.39 4.685 3.5 6.095V20l3.228-1.614C9.742 18.779 10.86 19 12 19c5.523 0 10-3.477 10-7.5S17.523 3 12 3z" />
              </svg>
              카카오 공유
            </button>
          </div>

          {/* 일정 & 장소 카드 */}
          <div className="border border-gray-100 rounded-2xl divide-y divide-gray-100 overflow-hidden">
            {/* 날짜/시간 */}
            <div className="flex items-center gap-3 p-4">
              <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-800">{fmtDate(event.startAt)}</div>
                <div className="text-sm text-gray-500 mt-0.5">
                  {fmtTime(event.startAt)} - {fmtTime(event.endAt)}
                </div>
              </div>
            </div>

            {/* 장소 */}
            {event.location && (
              <div className="flex items-center gap-3 p-4">
                <div className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div className="text-sm font-semibold text-gray-800">{event.location}</div>
              </div>
            )}

            {/* 신청 마감 */}
            {event.registrationDeadline && (
              <div className="flex items-center gap-3 p-4">
                <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-800">신청 마감</div>
                  <div className="text-sm text-gray-500 mt-0.5">{fmtDate(event.registrationDeadline)}</div>
                </div>
              </div>
            )}
          </div>

          {/* 행사 설명 */}
          {event.description && (
            <div className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
              {event.description}
            </div>
          )}

          {/* 환불 정책 (유료 행사) */}
          {event.isPaid && (event.refundDeadlineAt || event.refundContact) && (
            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 space-y-1 text-sm">
              <div className="font-semibold text-amber-800">환불 정책</div>
              {event.refundDeadlineAt && (
                <div className="text-gray-600">
                  {fmtDate(event.refundDeadlineAt)} {fmtTime(event.refundDeadlineAt)}까지 본인 환불 가능
                </div>
              )}
              {event.refundContact && (
                <div className="text-gray-500">환불 마감 이후 문의: {event.refundContact}</div>
              )}
            </div>
          )}

          {/* 호스트 전용 섹션 */}
          {isHost && (
            <div className="border-t pt-4 space-y-3">
              {event.status === 'DRAFT' && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between">
                  <span className="text-sm text-amber-700 font-medium">아직 공개되지 않은 행사입니다.</span>
                  <button
                    onClick={() => { if (confirm('행사를 공개하시겠습니까?')) publishMutation.mutate() }}
                    disabled={publishMutation.isPending}
                    className="btn btn-primary text-sm px-4 py-2 rounded-xl"
                  >
                    {publishMutation.isPending ? '공개 중...' : '공개하기'}
                  </button>
                </div>
              )}
              {event.status === 'PUBLISHED' && (
                <Link
                  to={`/events/${id}/checkin`}
                  className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-2xl text-sm font-semibold transition w-fit"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.243m-4.243 0L9.757 9.757M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  QR 체크인 관리
                </Link>
              )}
              <EventWhitelistManager eventId={id} />
            </div>
          )}
        </div>

        {/* 오른쪽: 신청 카드 (sticky) */}
        <div className="w-60 shrink-0 sticky top-6">
          <RegistrationCard
            event={event}
            user={user}
            myReg={myReg}
            activeCount={activeCount}
            navigate={navigate}
            applyMutation={applyMutation}
            cancelMutation={cancelMutation}
          />
        </div>

      </div>
    </div>
  )
}

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getReviews, createReview, updateReview } from '../api/reviews'

const MAX = 200

function timeAgo(iso) {
  const diff = Math.floor((Date.now() - new Date(iso)) / 1000)
  if (diff < 60) return '방금 전'
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`
  return `${Math.floor(diff / 86400)}일 전`
}

function CharCount({ value }) {
  const len = value.trim().length
  return (
    <span className={`text-xs ${len >= MAX ? 'text-red-500 font-semibold' : 'text-gray-400'}`}>
      {len}/{MAX}
    </span>
  )
}

function StarRating({ value, onChange, readonly = false }) {
  const [hovered, setHovered] = useState(0)
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => !readonly && onChange && onChange(star)}
          onMouseEnter={() => !readonly && setHovered(star)}
          onMouseLeave={() => !readonly && setHovered(0)}
          className={`text-xl leading-none ${readonly ? 'cursor-default' : 'cursor-pointer'} ${
            star <= (hovered || value) ? 'text-amber-400' : 'text-gray-300'
          }`}
        >
          ★
        </button>
      ))}
    </div>
  )
}

function ReviewItem({ r, eventId, user, queryKey }) {
  const queryClient = useQueryClient()
  const [editMode, setEditMode] = useState(false)
  const [editBody, setEditBody] = useState(r.body)
  const [editRating, setEditRating] = useState(r.rating)

  const isOwn = user && r.authorId === user.id
  const isLocked = r.lockedAt && new Date() > new Date(r.lockedAt)

  const editMutation = useMutation({
    mutationFn: () => updateReview(eventId, r.id, editRating, editBody),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey })
      setEditMode(false)
    },
    onError: (err) => alert(err.response?.data?.message ?? '수정에 실패했습니다.'),
  })

  return (
    <div className="border border-gray-100 rounded-2xl p-4 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-700">{r.authorName}</span>
          <span className="text-xs text-gray-400">{timeAgo(r.createdAt)}</span>
        </div>
        {isOwn && !isLocked && (
          <button
            onClick={() => { setEditMode(!editMode); setEditBody(r.body); setEditRating(r.rating) }}
            className="text-xs text-blue-500 hover:underline"
          >
            수정
          </button>
        )}
        {isOwn && isLocked && (
          <span className="text-xs text-gray-300">수정 기간 만료</span>
        )}
      </div>

      {editMode ? (
        <div className="space-y-2">
          <StarRating value={editRating} onChange={setEditRating} />
          <textarea
            value={editBody}
            onChange={(e) => setEditBody(e.target.value)}
            maxLength={MAX}
            rows={2}
            className="w-full text-sm border border-gray-200 rounded-xl p-2 resize-none focus:outline-none focus:ring-1 focus:ring-amber-400"
          />
          <div className="flex items-center justify-between">
            <CharCount value={editBody} />
            <div className="flex gap-2">
              <button
                onClick={() => { setEditMode(false); setEditBody(r.body); setEditRating(r.rating) }}
                className="text-xs px-3 py-1 rounded-lg border border-gray-200 text-gray-500"
              >
                취소
              </button>
              <button
                onClick={() => editMutation.mutate()}
                disabled={editMutation.isPending || !editBody.trim() || editBody.trim().length > MAX}
                className="text-xs px-3 py-1 rounded-lg bg-amber-500 text-white disabled:opacity-50"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          <StarRating value={r.rating} readonly />
          <p className="text-sm text-gray-800 whitespace-pre-wrap">{r.body}</p>
        </>
      )}
    </div>
  )
}

export default function EventReview({ eventId, user, checkedIn, eventEnded }) {
  const queryKey = ['reviews', eventId]
  const queryClient = useQueryClient()

  const { data: reviews = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => getReviews(eventId),
  })

  const [showForm, setShowForm] = useState(false)
  const [newBody, setNewBody] = useState('')
  const [newRating, setNewRating] = useState(0)
  const [isAnonymous, setIsAnonymous] = useState(false)

  const hasMyReview = user && reviews.some((r) => r.authorId === user.id)
  const canWrite = checkedIn && eventEnded && user && !hasMyReview

  const createMutation = useMutation({
    mutationFn: () => createReview(eventId, newRating, newBody, isAnonymous),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey })
      setNewBody('')
      setNewRating(0)
      setIsAnonymous(false)
      setShowForm(false)
    },
    onError: (err) => alert(err.response?.data?.message ?? '리뷰 등록에 실패했습니다.'),
  })

  const statusMessage = () => {
    if (!user) return '로그인 후 리뷰 작성 가능'
    if (!eventEnded) return '행사 종료 후 리뷰 작성 가능'
    if (!checkedIn) return '체크인한 참여자만 작성 가능'
    if (hasMyReview) return null
    return null
  }

  const msg = statusMessage()

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-gray-800">
          리뷰 <span className="text-sm font-normal text-gray-400">({reviews.length})</span>
        </h3>
        {canWrite && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="text-sm px-3 py-1.5 rounded-xl bg-amber-500 text-white font-semibold hover:bg-amber-600 transition"
          >
            리뷰 작성
          </button>
        )}
        {msg && (
          <span className="text-xs text-gray-400">{msg}</span>
        )}
      </div>

      {showForm && (
        <div className="border border-amber-200 rounded-2xl p-4 space-y-3 bg-amber-50/30">
          <div className="space-y-1">
            <p className="text-xs text-gray-500">별점을 선택해주세요</p>
            <StarRating value={newRating} onChange={setNewRating} />
          </div>
          <textarea
            value={newBody}
            onChange={(e) => setNewBody(e.target.value)}
            placeholder="행사에 대한 솔직한 리뷰를 남겨주세요 (최대 200자)"
            maxLength={MAX}
            rows={3}
            className="w-full text-sm border border-gray-200 rounded-xl p-3 resize-none focus:outline-none focus:ring-1 focus:ring-amber-400 bg-white"
          />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  className="rounded"
                />
                익명으로 등록
              </label>
              <CharCount value={newBody} />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { setShowForm(false); setNewBody(''); setNewRating(0); setIsAnonymous(false) }}
                className="text-xs px-3 py-1.5 rounded-xl border border-gray-200 text-gray-500"
              >
                취소
              </button>
              <button
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending || !newBody.trim() || newBody.trim().length > MAX || newRating === 0}
                className="text-xs px-3 py-1.5 rounded-xl bg-amber-500 text-white disabled:opacity-50"
              >
                {createMutation.isPending ? '등록 중...' : '등록'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="text-sm text-gray-400 text-center py-4">불러오는 중...</div>
      ) : reviews.length === 0 ? (
        <div className="text-sm text-gray-400 text-center py-6 border border-dashed border-gray-200 rounded-2xl">
          아직 리뷰가 없습니다.
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <ReviewItem key={r.id} r={r} eventId={eventId} user={user} queryKey={queryKey} />
          ))}
        </div>
      )}
    </div>
  )
}

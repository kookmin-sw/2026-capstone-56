import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getQuestions, createQuestion, updateQuestion, deleteQuestion, submitAnswer } from '../api/qa'

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

function QuestionItem({ q, eventId, user, isHost, queryKey }) {
  const queryClient = useQueryClient()
  const [editMode, setEditMode] = useState(false)
  const [editBody, setEditBody] = useState(q.body)
  const [answerMode, setAnswerMode] = useState(false)
  const [answerBody, setAnswerBody] = useState(q.answer?.body ?? '')

  const isOwn = user && q.authorId === user.id

  const editMutation = useMutation({
    mutationFn: () => updateQuestion(eventId, q.id, editBody),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey })
      setEditMode(false)
    },
    onError: (err) => alert(err.response?.data?.message ?? '수정에 실패했습니다.'),
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteQuestion(eventId, q.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
    onError: (err) => alert(err.response?.data?.message ?? '삭제에 실패했습니다.'),
  })

  const answerMutation = useMutation({
    mutationFn: () => submitAnswer(eventId, q.id, answerBody),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey })
      setAnswerMode(false)
    },
    onError: (err) => alert(err.response?.data?.message ?? '답변 등록에 실패했습니다.'),
  })

  return (
    <div className="border border-gray-100 rounded-2xl p-4 space-y-3">
      {/* 질문 */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-700">{q.authorName}</span>
            <span className="text-xs text-gray-400">{timeAgo(q.createdAt)}</span>
          </div>
          {isOwn && !q.answer && (
            <div className="flex gap-1.5">
              <button
                onClick={() => setEditMode(!editMode)}
                className="text-xs text-blue-500 hover:underline"
              >
                수정
              </button>
              <button
                onClick={() => {
                  if (confirm('질문을 삭제하시겠습니까?')) deleteMutation.mutate()
                }}
                disabled={deleteMutation.isPending}
                className="text-xs text-red-400 hover:underline"
              >
                삭제
              </button>
            </div>
          )}
        </div>

        {editMode ? (
          <div className="space-y-1.5">
            <textarea
              value={editBody}
              onChange={(e) => setEditBody(e.target.value)}
              maxLength={MAX}
              rows={2}
              className="w-full text-sm border border-gray-200 rounded-xl p-2 resize-none focus:outline-none focus:ring-1 focus:ring-primary-400"
            />
            <div className="flex items-center justify-between">
              <CharCount value={editBody} />
              <div className="flex gap-2">
                <button
                  onClick={() => { setEditMode(false); setEditBody(q.body) }}
                  className="text-xs px-3 py-1 rounded-lg border border-gray-200 text-gray-500"
                >
                  취소
                </button>
                <button
                  onClick={() => editMutation.mutate()}
                  disabled={editMutation.isPending || !editBody.trim() || editBody.trim().length > MAX}
                  className="text-xs px-3 py-1 rounded-lg bg-primary-600 text-white disabled:opacity-50"
                >
                  저장
                </button>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-800 whitespace-pre-wrap">{q.body}</p>
        )}
      </div>

      {/* 답변 */}
      {q.answer ? (
        <div className="bg-blue-50 rounded-xl p-3 space-y-1">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-blue-700">호스트</span>
              <span className="text-xs text-blue-500">{q.answer.authorName}</span>
              <span className="text-xs text-blue-400">{timeAgo(q.answer.updatedAt ?? q.answer.createdAt)}</span>
            </div>
            {isHost && (
              <button
                onClick={() => { setAnswerBody(q.answer.body); setAnswerMode(!answerMode) }}
                className="text-xs text-blue-600 hover:underline"
              >
                수정
              </button>
            )}
          </div>
          {answerMode ? (
            <div className="space-y-1.5 mt-1">
              <textarea
                value={answerBody}
                onChange={(e) => setAnswerBody(e.target.value)}
                maxLength={MAX}
                rows={2}
                className="w-full text-sm border border-blue-200 rounded-xl p-2 resize-none bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
              <div className="flex items-center justify-between">
                <CharCount value={answerBody} />
                <div className="flex gap-2">
                  <button
                    onClick={() => { setAnswerMode(false); setAnswerBody(q.answer.body) }}
                    className="text-xs px-3 py-1 rounded-lg border border-blue-200 text-blue-500"
                  >
                    취소
                  </button>
                  <button
                    onClick={() => answerMutation.mutate()}
                    disabled={answerMutation.isPending || !answerBody.trim() || answerBody.trim().length > MAX}
                    className="text-xs px-3 py-1 rounded-lg bg-blue-600 text-white disabled:opacity-50"
                  >
                    저장
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-blue-800 whitespace-pre-wrap">{q.answer.body}</p>
          )}
        </div>
      ) : isHost ? (
        <div>
          {answerMode ? (
            <div className="space-y-1.5">
              <textarea
                value={answerBody}
                onChange={(e) => setAnswerBody(e.target.value)}
                placeholder="답변을 입력하세요"
                maxLength={MAX}
                rows={2}
                className="w-full text-sm border border-blue-200 rounded-xl p-2 resize-none focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
              <div className="flex items-center justify-between">
                <CharCount value={answerBody} />
                <div className="flex gap-2">
                  <button
                    onClick={() => setAnswerMode(false)}
                    className="text-xs px-3 py-1 rounded-lg border border-gray-200 text-gray-500"
                  >
                    취소
                  </button>
                  <button
                    onClick={() => answerMutation.mutate()}
                    disabled={answerMutation.isPending || !answerBody.trim() || answerBody.trim().length > MAX}
                    className="text-xs px-3 py-1 rounded-lg bg-blue-600 text-white disabled:opacity-50"
                  >
                    답변 등록
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setAnswerMode(true)}
              className="text-xs text-blue-500 hover:underline"
            >
              답변하기
            </button>
          )}
        </div>
      ) : (
        <p className="text-xs text-gray-400 italic">아직 답변이 없습니다.</p>
      )}
    </div>
  )
}

export default function EventQnA({ eventId, user, isHost }) {
  const queryKey = ['questions', eventId]
  const queryClient = useQueryClient()

  const { data: questions = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => getQuestions(eventId),
  })

  const [newBody, setNewBody] = useState('')
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [showForm, setShowForm] = useState(false)

  const createMutation = useMutation({
    mutationFn: () => createQuestion(eventId, newBody, isAnonymous),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey })
      setNewBody('')
      setIsAnonymous(false)
      setShowForm(false)
    },
    onError: (err) => alert(err.response?.data?.message ?? '질문 등록에 실패했습니다.'),
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-gray-800">Q&amp;A <span className="text-sm font-normal text-gray-400">({questions.length})</span></h3>
        {user && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="text-sm px-3 py-1.5 rounded-xl bg-primary-600 text-white font-semibold hover:bg-primary-700 transition"
          >
            질문하기
          </button>
        )}
        {!user && (
          <span className="text-xs text-gray-400">로그인 후 질문 가능</span>
        )}
      </div>

      {showForm && (
        <div className="border border-primary-200 rounded-2xl p-4 space-y-3 bg-primary-50/30">
          <textarea
            value={newBody}
            onChange={(e) => setNewBody(e.target.value)}
            placeholder="궁금한 점을 질문해보세요 (최대 200자)"
            maxLength={MAX}
            rows={3}
            className="w-full text-sm border border-gray-200 rounded-xl p-3 resize-none focus:outline-none focus:ring-1 focus:ring-primary-400 bg-white"
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
                onClick={() => { setShowForm(false); setNewBody(''); setIsAnonymous(false) }}
                className="text-xs px-3 py-1.5 rounded-xl border border-gray-200 text-gray-500"
              >
                취소
              </button>
              <button
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending || !newBody.trim() || newBody.trim().length > MAX}
                className="text-xs px-3 py-1.5 rounded-xl bg-primary-600 text-white disabled:opacity-50"
              >
                {createMutation.isPending ? '등록 중...' : '등록'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="text-sm text-gray-400 text-center py-4">불러오는 중...</div>
      ) : questions.length === 0 ? (
        <div className="text-sm text-gray-400 text-center py-6 border border-dashed border-gray-200 rounded-2xl">
          아직 질문이 없습니다. 첫 번째로 질문해보세요!
        </div>
      ) : (
        <div className="space-y-3">
          {questions.map((q) => (
            <QuestionItem key={q.id} q={q} eventId={eventId} user={user} isHost={isHost} queryKey={queryKey} />
          ))}
        </div>
      )}
    </div>
  )
}

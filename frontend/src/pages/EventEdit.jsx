import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { getEvent, updateEvent, uploadEventImage } from '../api/events'
import { useAuth } from '../hooks/useAuth'

function toLocal(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}

function Section({ icon, title, children }) {
  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-card p-6 space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-lg">{icon}</span>
        <h2 className="text-base font-bold text-gray-800">{title}</h2>
      </div>
      {children}
    </div>
  )
}

function Field({ label, hint, children }) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        {hint && <span className="text-xs text-gray-400">{hint}</span>}
      </div>
      {children}
    </div>
  )
}

function ImageUploadZone({ imagePreview, onFile, uploading }) {
  const inputRef = useRef(null)
  const [dragOver, setDragOver] = useState(false)

  const handleFile = useCallback((file) => {
    if (!file || !/image\/(jpeg|png|webp)/.test(file.type)) {
      alert('JPG, PNG, WEBP 형식만 지원합니다.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('파일 크기는 5MB 이하여야 합니다.')
      return
    }
    onFile(file)
  }, [onFile])

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      className={`relative cursor-pointer rounded-2xl border-2 border-dashed transition-colors overflow-hidden
        ${dragOver ? 'border-primary-400 bg-primary-50' : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'}`}
      style={{ minHeight: '180px' }}
    >
      {imagePreview ? (
        <div className="relative">
          <img src={imagePreview} alt="미리보기" className="w-full h-48 object-cover rounded-xl" />
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity rounded-xl">
            <span className="text-white text-sm font-semibold">클릭하여 변경</span>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-[180px] gap-2 text-gray-400">
          {uploading ? (
            <div className="w-6 h-6 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg className="w-10 h-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          )}
          <span className="text-sm font-medium text-gray-500">
            {uploading ? '업로드 중...' : '클릭하여 이미지 업로드'}
          </span>
          {!uploading && <span className="text-xs">JPG · PNG · WEBP</span>}
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => e.target.files[0] && handleFile(e.target.files[0])}
      />
    </div>
  )
}

const RELEASE_INTERVALS = [5, 15, 30, 60]

export default function EventEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const { data: event, isLoading, isError } = useQuery({
    queryKey: ['event', id],
    queryFn: () => getEvent(id),
  })

  const [form, setForm] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    if (event && !form) {
      setForm({
        title: event.title ?? '',
        description: event.description ?? '',
        location: event.location ?? '',
        startAt: toLocal(event.startAt),
        endAt: toLocal(event.endAt),
        registrationDeadline: toLocal(event.registrationDeadline),
        capacity: event.capacity ?? 100,
        isPaid: event.isPaid ?? false,
        price: event.price ?? '',
        releaseIntervalMinutes: event.releaseIntervalMinutes ?? 15,
        refundDeadlineType: event.refundDeadlineType ?? 'NONE',
        refundDeadlineValue: event.refundDeadlineValue ?? 30,
        refundContact: event.refundContact ?? '',
        imageUrl: event.imageUrl ?? '',
        openMode: event.publishAt ? 'scheduled' : 'immediate',
        publishAt: toLocal(event.publishAt),
      })
      if (event.imageUrl) setImagePreview(event.imageUrl)
    }
  }, [event, form])

  const isStarted = event ? new Date(event.startAt) <= new Date() : false
  const isClosed = event?.status === 'CLOSED'

  const canManage = user && event && (
    user.id === event.host?.id ||
    ['SCHOOL_ADMIN', 'OPERATOR'].includes(user.role)
  )

  const updateMutation = useMutation({
    mutationFn: (data) => updateEvent(id, data),
    onSuccess: () => navigate(`/events/${id}`),
    onError: (err) => alert(err.response?.data?.message ?? '수정에 실패했습니다.'),
  })

  const handleImageFile = async (file) => {
    setImagePreview(URL.createObjectURL(file))
    setUploading(true)
    try {
      const { imageUrl } = await uploadEventImage(file)
      setForm(f => ({ ...f, imageUrl }))
    } catch {
      alert('이미지 업로드에 실패했습니다.')
      setImagePreview(event?.imageUrl ?? null)
      setForm(f => ({ ...f, imageUrl: event?.imageUrl ?? '' }))
    } finally {
      setUploading(false)
    }
  }

  const set = (k) => (e) =>
    setForm(f => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  const handleSubmit = (e) => {
    e.preventDefault()
    if (uploading) return alert('이미지 업로드가 완료될 때까지 기다려주세요.')
    if (form.openMode === 'scheduled' && !form.publishAt) return alert('오픈 시각을 입력해주세요.')

    const payload = isStarted
      ? { endAt: form.endAt }
      : {
          ...form,
          capacity: Number(form.capacity),
          price: form.isPaid ? Number(form.price) : null,
          releaseIntervalMinutes: Number(form.releaseIntervalMinutes),
          refundDeadlineValue: form.isPaid && form.refundDeadlineType !== 'NONE' ? Number(form.refundDeadlineValue) : null,
          refundDeadlineType: form.isPaid ? form.refundDeadlineType : 'NONE',
          imageUrl: form.imageUrl || null,
          publishAt: form.openMode === 'scheduled' && form.publishAt ? form.publishAt : null,
        }
    updateMutation.mutate(payload)
  }

  if (isLoading) return <div className="card p-12 text-center text-gray-400">불러오는 중...</div>
  if (isError || !event) return <div className="card p-12 text-center text-gray-400">행사를 찾을 수 없습니다.</div>
  if (!canManage) return <div className="card p-12 text-center text-gray-400">수정 권한이 없습니다.</div>
  if (!form) return null

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-3 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          뒤로
        </button>
        <h1 className="text-2xl font-bold text-gray-900">행사 수정</h1>
      </div>

      {isStarted && (
        <div className="mb-4 bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-800">
          행사가 이미 시작되었습니다. <strong>종료 시각만</strong> 수정할 수 있습니다. (BR-26)
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {isStarted ? (
          <Section icon="📅" title="종료 시각 수정">
            <Field label="종료 시각 *">
              <input type="datetime-local" className="input" required value={form.endAt} onChange={set('endAt')} />
            </Field>
          </Section>
        ) : (
          <>
            <Section icon="🖼️" title="대표 이미지">
              <Field label="행사 이미지">
                <ImageUploadZone imagePreview={imagePreview} onFile={handleImageFile} uploading={uploading} />
              </Field>
            </Section>

            <Section icon="📝" title="기본 정보">
              <Field label="행사명 *" hint={`${form.title.length}/50`}>
                <input className="input" required maxLength={50} value={form.title} onChange={set('title')} />
              </Field>
              <Field label="설명 *" hint={`${form.description.length}/500`}>
                <textarea className="input min-h-[120px] resize-none" required maxLength={500} value={form.description} onChange={set('description')} />
              </Field>
            </Section>

            <Section icon="📅" title="일정 & 장소">
              <Field label="장소">
                <input className="input" placeholder="예: 학생회관 대강당" value={form.location} onChange={set('location')} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="시작 *">
                  <input type="datetime-local" className="input" required value={form.startAt} onChange={set('startAt')} />
                </Field>
                <Field label="종료 *">
                  <input type="datetime-local" className="input" required value={form.endAt} onChange={set('endAt')} />
                </Field>
              </div>
              <Field label="신청 마감">
                <input type="datetime-local" className="input" value={form.registrationDeadline} onChange={set('registrationDeadline')} />
              </Field>
            </Section>

            <Section icon="⚙️" title="신청 설정">
              <Field label="정원 *">
                <input type="number" min={1} className="input" required value={form.capacity} onChange={set('capacity')} />
              </Field>
              <Field label="취소표 릴리즈 주기">
                <div className="flex gap-2 flex-wrap">
                  {RELEASE_INTERVALS.map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, releaseIntervalMinutes: m }))}
                      className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                        form.releaseIntervalMinutes === m
                          ? 'bg-primary-600 text-white shadow-sm'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {m}분
                    </button>
                  ))}
                </div>
              </Field>
            </Section>

            <Section icon="💳" title="결제 설정">
              <label className={`flex items-center gap-3 ${isClosed ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
                <div
                  onClick={() => !isClosed && setForm(f => ({ ...f, isPaid: !f.isPaid }))}
                  className={`w-10 h-6 rounded-full transition-colors relative ${form.isPaid ? 'bg-primary-600' : 'bg-gray-200'}`}
                >
                  <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.isPaid ? 'left-5' : 'left-1'}`} />
                </div>
                <span className="text-sm font-medium text-gray-700">유료 행사</span>
                {isClosed && <span className="text-xs text-gray-400">(신청 마감 후 변경 불가)</span>}
              </label>

              {form.isPaid && (
                <div className="space-y-4 pt-2 border-t">
                  <Field label="가격 (원, 100원 이상) *">
                    <div className="relative">
                      <input type="number" min={100} className="input pr-8" value={form.price} onChange={set('price')} />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">원</span>
                    </div>
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="환불 마감 기준">
                      <select className="input" value={form.refundDeadlineType} onChange={set('refundDeadlineType')}>
                        <option value="NONE">없음 (자유 환불)</option>
                        <option value="MINUTES">분 전</option>
                        <option value="HOURS">시간 전</option>
                      </select>
                    </Field>
                    <Field label="환불 마감 값">
                      <input type="number" min={0} className="input" value={form.refundDeadlineValue} onChange={set('refundDeadlineValue')} disabled={form.refundDeadlineType === 'NONE'} />
                    </Field>
                  </div>
                  <Field label="환불 마감 이후 문의처">
                    <input className="input" placeholder="예: host@univ.ac.kr / 010-1234-5678" value={form.refundContact} onChange={set('refundContact')} />
                  </Field>
                </div>
              )}
            </Section>

            <Section icon="🚀" title="오픈 설정">
              <Field label="행사 카드 공개 시점">
                <div className="flex gap-2">
                  {[{ mode: 'immediate', label: '⚡ 바로 오픈' }, { mode: 'scheduled', label: '🕐 지정된 시간에 오픈' }].map(({ mode, label }) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, openMode: mode, publishAt: mode === 'immediate' ? '' : f.publishAt }))}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                        form.openMode === mode ? 'bg-primary-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {form.openMode === 'scheduled' && (
                  <div className="mt-3 space-y-1">
                    <input type="datetime-local" className="input" value={form.publishAt} onChange={set('publishAt')} />
                    <p className="text-xs text-gray-400">설정한 시각이 되면 행사 카드가 목록에 공개됩니다.</p>
                  </div>
                )}
              </Field>
            </Section>
          </>
        )}

        <div className="flex gap-3 pb-8">
          <button type="button" onClick={() => navigate(-1)} className="btn flex-1 border border-gray-200 text-gray-600">
            취소
          </button>
          <button
            type="submit"
            disabled={updateMutation.isPending || uploading}
            className="btn btn-primary flex-2 flex-grow-[2] disabled:opacity-60"
          >
            {updateMutation.isPending ? '저장 중...' : '저장하기'}
          </button>
        </div>
      </form>
    </div>
  )
}

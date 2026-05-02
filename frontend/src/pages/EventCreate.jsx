import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { createEvent } from '../api/events'
import { useAuth } from '../hooks/useAuth'

const RELEASE_INTERVALS = [5, 15, 30, 60]

export default function EventCreate() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [form, setForm] = useState({
    title: '',
    description: '',
    location: '',
    startAt: '',
    endAt: '',
    registrationDeadline: '',
    capacity: 30,
    isPaid: false,
    price: '',
    releaseIntervalMinutes: 15,
    refundDeadlineType: 'MINUTES',
    refundDeadlineValue: 30,
    refundContact: '',
  })

  const canCreate = user && ['CERTIFIED', 'SCHOOL_ADMIN', 'OPERATOR'].includes(user.role)

  const mutation = useMutation({
    mutationFn: createEvent,
    onSuccess: (event) => {
      alert('행사가 생성되었습니다.')
      navigate(`/events/${event.id}`)
    },
    onError: (err) => {
      alert(err.response?.data?.message ?? '생성 실패')
    },
  })

  if (!canCreate) {
    return (
      <div className="card p-12 text-center text-gray-600">
        행사 생성 권한이 없습니다. 인증사용자(CERTIFIED) 이상만 가능합니다.
      </div>
    )
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const payload = {
      ...form,
      capacity: Number(form.capacity),
      price: form.isPaid ? Number(form.price) : null,
      releaseIntervalMinutes: Number(form.releaseIntervalMinutes),
      refundDeadlineValue: form.isPaid ? Number(form.refundDeadlineValue) : null,
      refundDeadlineType: form.isPaid ? form.refundDeadlineType : 'NONE',
    }
    mutation.mutate(payload)
  }

  const update = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">행사 생성</h1>
      <form onSubmit={handleSubmit} className="card p-8 space-y-4">
        <Field label="제목 *">
          <input className="input" required value={form.title} onChange={update('title')} maxLength={100} />
        </Field>
        <Field label="설명">
          <textarea className="input min-h-[100px]" value={form.description} onChange={update('description')} />
        </Field>
        <Field label="장소">
          <input className="input" value={form.location} onChange={update('location')} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="시작 *">
            <input type="datetime-local" className="input" required value={form.startAt} onChange={update('startAt')} />
          </Field>
          <Field label="종료 *">
            <input type="datetime-local" className="input" required value={form.endAt} onChange={update('endAt')} />
          </Field>
        </div>
        <Field label="신청 마감">
          <input type="datetime-local" className="input" value={form.registrationDeadline} onChange={update('registrationDeadline')} />
        </Field>
        <Field label="정원 *">
          <input type="number" min={1} className="input" required value={form.capacity} onChange={update('capacity')} />
        </Field>
        <Field label="취소표 릴리즈 주기 (분)">
          <select className="input" value={form.releaseIntervalMinutes} onChange={update('releaseIntervalMinutes')}>
            {RELEASE_INTERVALS.map(m => <option key={m} value={m}>{m}분</option>)}
          </select>
        </Field>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.isPaid} onChange={update('isPaid')} />
          유료 행사
        </label>

        {form.isPaid && (
          <>
            <Field label="가격 (원, 100원 이상)">
              <input type="number" min={100} className="input" value={form.price} onChange={update('price')} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="환불 마감 단위">
                <select className="input" value={form.refundDeadlineType} onChange={update('refundDeadlineType')}>
                  <option value="NONE">없음(자유 환불)</option>
                  <option value="MINUTES">분</option>
                  <option value="HOURS">시간</option>
                </select>
              </Field>
              <Field label="환불 마감 값 (행사 시작 N분/시간 전)">
                <input type="number" min={0} className="input" value={form.refundDeadlineValue} onChange={update('refundDeadlineValue')} disabled={form.refundDeadlineType === 'NONE'} />
              </Field>
            </div>
            <Field label="환불 마감 이후 문의처 (refundContact, 자유 텍스트)">
              <input className="input" value={form.refundContact} onChange={update('refundContact')} placeholder="예: hostkim@univ.ac.kr / 010-1234-5678" />
            </Field>
          </>
        )}

        <div className="flex gap-2 pt-2">
          <button type="button" onClick={() => navigate(-1)} className="btn flex-1 border border-gray-200">취소</button>
          <button type="submit" disabled={mutation.isPending} className="btn btn-primary flex-1">
            {mutation.isPending ? '생성 중...' : '생성'}
          </button>
        </div>
      </form>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <label className="block text-sm">
      <div className="text-gray-700 font-medium mb-1">{label}</div>
      {children}
    </label>
  )
}

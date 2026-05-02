import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { register as registerApi } from '../api/auth'
import { getSchools } from '../api/schools'
import { useToast } from '../components/Toast'

export default function Register() {
  const { register, handleSubmit, formState: { errors, isSubmitting }, watch } = useForm()
  const toast = useToast()
  const [done, setDone] = useState(false)
  const [sentEmail, setSentEmail] = useState('')

  const emailValue = watch('email', '')
  const { data: schools = [] } = useQuery({ queryKey: ['schools'], queryFn: getSchools })
  const detectedDomain = emailValue?.includes('@') ? emailValue.split('@')[1] : ''
  const detectedSchool = schools.find(s => s.domain === detectedDomain)

  const onSubmit = async (data) => {
    try {
      await registerApi(data)
      setSentEmail(data.email)
      setDone(true)
    } catch (err) {
      toast(err.response?.data?.message || '회원가입에 실패했습니다.', 'error')
    }
  }

  if (done) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="w-full max-w-md text-center card p-10">
          <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-xl font-extrabold text-gray-900 mb-2">이메일을 확인해주세요</h2>
          <p className="text-sm text-gray-500 mb-1">
            <span className="font-semibold text-gray-700">{sentEmail}</span>으로
          </p>
          <p className="text-sm text-gray-500 mb-6">인증 링크를 보내드렸습니다.<br />링크를 클릭하면 가입이 완료됩니다.</p>
          <Link to="/login" className="btn-primary w-full justify-center">로그인 페이지로</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-primary-600 rounded-2xl mb-4">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">무료로 시작하세요</h1>
          <p className="text-gray-500 mt-1 text-sm">대학 행사 티켓 플랫폼</p>
        </div>

        <div className="card p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">실명 *</label>
                <input
                  {...register('name', { required: '이름을 입력하세요' })}
                  type="text"
                  placeholder="홍길동"
                  className="input"
                />
                {errors.name && <p className="text-red-500 text-xs mt-1.5">{errors.name.message}</p>}
              </div>
              <div>
                <label className="label">학번 *</label>
                <input
                  {...register('studentId', { required: '학번을 입력하세요' })}
                  type="text"
                  placeholder="20230001"
                  className="input"
                />
                {errors.studentId && <p className="text-red-500 text-xs mt-1.5">{errors.studentId.message}</p>}
              </div>
            </div>
            <div>
              <label className="label">이메일</label>
              <input
                {...register('email', {
                  required: '이메일을 입력하세요',
                  validate: (v) => v.includes('.ac.kr') || v.includes('.edu') || '학교 이메일(.ac.kr 또는 .edu)만 가입할 수 있습니다.'
                })}
                type="email"
                placeholder="xxx@university.ac.kr"
                className="input"
              />
              {errors.email
                ? <p className="text-red-500 text-xs mt-1.5">{errors.email.message}</p>
                : detectedSchool
                  ? <p className="text-xs text-primary-600 mt-1.5 flex items-center gap-1">🏫 {detectedSchool.name} 학생으로 등록됩니다</p>
                  : <p className="text-xs text-gray-400 mt-1.5">학교 이메일(.ac.kr 또는 .edu)로만 가입 가능합니다</p>
              }
            </div>
            <div>
              <label className="label">비밀번호</label>
              <input
                {...register('password', { required: '비밀번호를 입력하세요', minLength: { value: 8, message: '8자 이상 입력하세요' } })}
                type="password"
                placeholder="8자 이상"
                className="input"
              />
              {errors.password && <p className="text-red-500 text-xs mt-1.5">{errors.password.message}</p>}
            </div>
            <div>
              <label className="label">비밀번호 확인</label>
              <input
                {...register('confirm', {
                  required: '비밀번호 확인을 입력하세요',
                  validate: (v) => v === watch('password') || '비밀번호가 일치하지 않습니다'
                })}
                type="password"
                placeholder="비밀번호 재입력"
                className="input"
              />
              {errors.confirm && <p className="text-red-500 text-xs mt-1.5">{errors.confirm.message}</p>}
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-start gap-2.5">
                <input
                  id="terms"
                  type="checkbox"
                  {...register('terms', { required: '서비스 이용약관에 동의해주세요.' })}
                  className="mt-0.5 w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-400 cursor-pointer"
                />
                <label htmlFor="terms" className="text-sm text-gray-600 cursor-pointer leading-snug">
                  <Link to="/terms" target="_blank" className="text-primary-600 font-medium hover:underline">서비스 이용약관</Link>에 동의합니다. <span className="text-red-500">(필수)</span>
                </label>
              </div>
              {errors.terms && <p className="text-red-500 text-xs -mt-1 ml-6">{errors.terms.message}</p>}
              <div className="flex items-start gap-2.5">
                <input
                  id="privacy"
                  type="checkbox"
                  {...register('privacy', { required: '개인정보 처리방침에 동의해주세요.' })}
                  className="mt-0.5 w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-400 cursor-pointer"
                />
                <label htmlFor="privacy" className="text-sm text-gray-600 cursor-pointer leading-snug">
                  <Link to="/privacy" target="_blank" className="text-primary-600 font-medium hover:underline">개인정보 처리방침</Link>에 동의합니다. <span className="text-red-500">(필수)</span>
                </label>
              </div>
              {errors.privacy && <p className="text-red-500 text-xs -mt-1 ml-6">{errors.privacy.message}</p>}
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full justify-center py-3 mt-1"
            >
              {isSubmitting ? '가입 중...' : '가입하기'}
            </button>
          </form>

          <div className="flex items-center gap-3 mt-4">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400">또는</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          <a
            href={`${import.meta.env.VITE_API_BASE_URL}/auth/kakao`}
            className="flex items-center justify-center gap-2.5 w-full bg-yellow-400 hover:bg-yellow-500 text-gray-900 py-3 rounded-xl font-medium transition mt-3"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 3C6.477 3 2 6.582 2 11c0 2.746 1.646 5.184 4.145 6.726L5.09 21l4.182-2.195A11.7 11.7 0 0012 19c5.523 0 10-3.582 10-8s-4.477-8-10-8z" />
            </svg>
            카카오로 시작하기
          </a>
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          이미 계정이 있으신가요?{' '}
          <Link to="/login" className="text-primary-600 font-medium hover:underline">
            로그인
          </Link>
        </p>
      </div>
    </div>
  )
}

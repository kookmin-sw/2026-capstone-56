import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useToast } from '../components/Toast'
import { getSchools } from '../api/schools'
import axios from '../api/axios'

function decodeToken(token) {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const json = decodeURIComponent(
      atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
    )
    return JSON.parse(json)
  } catch {
    return {}
  }
}

export default function KakaoRegister() {
  const [params] = useSearchParams()
  const tempToken = params.get('tempToken')
  const kakaoName = tempToken ? (decodeToken(tempToken).kakaoName || '') : ''
  const navigate = useNavigate()
  const toast = useToast()
  const [done, setDone] = useState(false)
  const [sentEmail, setSentEmail] = useState('')

  const { register, handleSubmit, formState: { errors, isSubmitting }, watch } = useForm({
    defaultValues: { name: kakaoName }
  })
  const { data: schools = [] } = useQuery({ queryKey: ['schools'], queryFn: getSchools })

  const emailValue = watch('email', '')
  const detectedDomain = emailValue?.includes('@') ? emailValue.split('@')[1] : ''
  const detectedSchool = schools.find(s => s.domain === detectedDomain)

  const onSubmit = async (data) => {
    if (!tempToken) {
      toast('인증 세션이 없습니다. 다시 카카오 로그인을 시도해주세요.', 'error')
      navigate('/login')
      return
    }
    try {
      await axios.post('/auth/kakao/complete', { tempToken, ...data })
      setSentEmail(data.email)
      setDone(true)
    } catch (err) {
      toast(err.response?.data?.message || '가입에 실패했습니다.', 'error')
    }
  }

  if (!tempToken) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">잘못된 접근입니다.</p>
          <button onClick={() => navigate('/login')} className="text-indigo-600 hover:underline text-sm">
            로그인 페이지로 돌아가기
          </button>
        </div>
      </div>
    )
  }

  if (done) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="w-full max-w-md text-center bg-white rounded-2xl border p-10">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-xl font-extrabold text-gray-900 mb-2">이메일을 확인해주세요</h2>
          <p className="text-sm text-gray-500 mb-1">
            <span className="font-semibold text-gray-700">{sentEmail}</span>으로
          </p>
          <p className="text-sm text-gray-500 mb-6">인증 링크를 보내드렸습니다.<br />인증 후 카카오로 로그인하세요.</p>
          <button
            onClick={() => navigate('/login')}
            className="block w-full bg-yellow-400 text-gray-900 py-3 rounded-xl font-medium hover:bg-yellow-500 transition text-center"
          >
            로그인 페이지로
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-yellow-400 rounded-2xl mb-4">
            <svg className="w-7 h-7 text-gray-900" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 3C6.477 3 2 6.582 2 11c0 2.746 1.646 5.184 4.145 6.726L5.09 21l4.182-2.195A11.7 11.7 0 0012 19c5.523 0 10-3.582 10-8s-4.477-8-10-8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">카카오 계정 연동</h1>
          <p className="text-gray-500 mt-1 text-sm">학교 이메일을 입력해 가입을 완료하세요</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">이름 *</label>
              <input
                {...register('name', { required: '이름을 입력하세요' })}
                type="text"
                placeholder="홍길동"
                className="w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition"
              />
              {errors.name && <p className="text-red-500 text-xs mt-1.5">{errors.name.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">학번 *</label>
              <input
                {...register('studentId', { required: '학번을 입력하세요' })}
                type="text"
                placeholder="20230001"
                className="w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition"
              />
              {errors.studentId && <p className="text-red-500 text-xs mt-1.5">{errors.studentId.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">학교 이메일 *</label>
              <input
                {...register('email', {
                  required: '이메일을 입력하세요',
                  validate: (v) => v.includes('.ac.kr') || v.includes('.edu') || '학교 이메일(.ac.kr 또는 .edu)만 가입할 수 있습니다.'
                })}
                type="email"
                placeholder="xxx@university.ac.kr"
                className="w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition"
              />
              {errors.email
                ? <p className="text-red-500 text-xs mt-1.5">{errors.email.message}</p>
                : detectedSchool
                  ? <p className="text-xs text-yellow-600 mt-1.5">🏫 {detectedSchool.name} 학생으로 등록됩니다</p>
                  : <p className="text-xs text-gray-400 mt-1.5">학교 이메일(.ac.kr 또는 .edu)로만 가입 가능합니다</p>
              }
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-yellow-400 text-gray-900 py-3 rounded-xl font-medium hover:bg-yellow-500 disabled:opacity-50 transition mt-1"
            >
              {isSubmitting ? '처리 중...' : '가입 완료하기'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

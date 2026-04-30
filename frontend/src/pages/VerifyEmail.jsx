import { useEffect, useRef, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { verifyEmail } from '../api/auth'

export default function VerifyEmail() {
  const [params] = useSearchParams()
  const token = params.get('token')
  const [status, setStatus] = useState('loading') // loading | success | error
  const called = useRef(false)

  useEffect(() => {
    if (!token) { setStatus('error'); return }
    if (called.current) return
    called.current = true
    verifyEmail(token)
      .then(() => setStatus('success'))
      .catch(() => setStatus('error'))
  }, [])

  if (status === 'loading') {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-primary-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 text-sm">인증 처리 중...</p>
        </div>
      </div>
    )
  }

  if (status === 'success') {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="w-full max-w-md text-center card p-10">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-extrabold text-gray-900 mb-2">이메일 인증 완료!</h2>
          <p className="text-sm text-gray-500 mb-6">이제 로그인해서 서비스를 이용하실 수 있습니다.</p>
          <Link to="/login" className="btn-primary w-full justify-center">로그인하러 가기</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="w-full max-w-md text-center card p-10">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-xl font-extrabold text-gray-900 mb-2">인증 링크가 유효하지 않아요</h2>
        <p className="text-sm text-gray-500 mb-6">링크가 만료됐거나 이미 사용된 링크입니다.</p>
        <Link to="/login" className="btn-primary w-full justify-center">로그인 페이지로</Link>
      </div>
    </div>
  )
}

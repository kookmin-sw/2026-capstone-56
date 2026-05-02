import { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { resetPassword } from '../api/auth'
import { useToast } from '../components/Toast'
import PasswordStrength from '../components/PasswordStrength'

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const navigate = useNavigate()
  const toast = useToast()

  const [pw, setPw] = useState({ password: '', confirm: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!token) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="card p-8 w-full max-w-md text-center">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-base font-bold text-gray-900 mb-2">유효하지 않은 링크</h2>
          <p className="text-sm text-gray-500 mb-5">비밀번호 재설정 링크가 올바르지 않습니다.</p>
          <Link to="/forgot-password" className="btn-primary justify-center">재설정 메일 다시 받기</Link>
        </div>
      </div>
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!pw.password) return setError('새 비밀번호를 입력해주세요.')
    if (pw.password.length < 8) return setError('비밀번호는 8자 이상이어야 합니다.')
    if (pw.password !== pw.confirm) return setError('비밀번호가 일치하지 않습니다.')
    setError('')
    setLoading(true)
    try {
      await resetPassword(token, pw.password)
      toast('비밀번호가 변경되었습니다. 새 비밀번호로 로그인해주세요.', 'success')
      navigate('/login')
    } catch (err) {
      setError(err.response?.data?.message || '변경에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-primary-600 rounded-2xl mb-4">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">새 비밀번호 설정</h1>
          <p className="text-gray-500 mt-1 text-sm">8자 이상의 새 비밀번호를 입력하세요</p>
        </div>

        <div className="card p-8">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div>
              <label className="label">새 비밀번호</label>
              <input
                type="password"
                value={pw.password}
                onChange={e => setPw(v => ({ ...v, password: e.target.value }))}
                placeholder="8자 이상"
                className="input"
              />
              <PasswordStrength password={pw.password} />
            </div>
            <div>
              <label className="label">새 비밀번호 확인</label>
              <input
                type="password"
                value={pw.confirm}
                onChange={e => setPw(v => ({ ...v, confirm: e.target.value }))}
                placeholder="비밀번호 재입력"
                className="input"
              />
              {error && <p className="text-red-500 text-xs mt-1.5">{error}</p>}
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center py-3"
            >
              {loading ? '변경 중...' : '비밀번호 변경'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

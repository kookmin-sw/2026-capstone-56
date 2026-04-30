import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../components/Toast'

export default function KakaoCallback() {
  const [params] = useSearchParams()
  const { login } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()

  useEffect(() => {
    const token = params.get('token')
    const userStr = params.get('user')
    const error = params.get('error')

    if (error) {
      toast(error === 'kakao_denied' ? '카카오 로그인을 취소했습니다.' : '카카오 로그인에 실패했습니다.', 'error')
      navigate('/login', { replace: true })
      return
    }

    if (token && userStr) {
      try {
        const user = JSON.parse(decodeURIComponent(userStr))
        login(token, user)
        navigate('/', { replace: true })
      } catch {
        toast('로그인 처리 중 오류가 발생했습니다.', 'error')
        navigate('/login', { replace: true })
      }
    } else {
      navigate('/login', { replace: true })
    }
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-500 text-sm">카카오 로그인 처리 중...</p>
      </div>
    </div>
  )
}

import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Register from './pages/Register'
import KakaoCallback from './pages/KakaoCallback'
import KakaoRegister from './pages/KakaoRegister'
import VerifyEmail from './pages/VerifyEmail'
import PrivateRoute from './components/PrivateRoute'

function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">사용자 관리 도메인</h1>
        <p className="text-gray-500 text-sm">로그인/회원가입 기능 테스트 페이지</p>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/register/kakao" element={<KakaoRegister />} />
        <Route path="/auth/kakao/callback" element={<KakaoCallback />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/" element={<PrivateRoute><Home /></PrivateRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}

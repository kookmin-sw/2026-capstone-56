import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Register from './pages/Register'
import KakaoCallback from './pages/KakaoCallback'
import KakaoRegister from './pages/KakaoRegister'
import VerifyEmail from './pages/VerifyEmail'
import PrivateRoute from './components/PrivateRoute'
import OperatorRoute from './components/OperatorRoute'
import SchoolAdminRoute from './components/SchoolAdminRoute'
import SchoolManage from './pages/SchoolManage'
import SchoolDetail from './pages/SchoolDetail'
import SchoolAdminDashboard from './pages/SchoolAdminDashboard'
import Home from './pages/Home'
import EventDetail from './pages/EventDetail'
import EventCreate from './pages/EventCreate'
import MyTickets from './pages/MyTickets'
import Profile from './pages/Profile'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import Header from './components/Header'

export default function App() {
  return (
    <div className="min-h-screen bg-[#e9e4ff]">
      <Header />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/register/kakao" element={<KakaoRegister />} />
        <Route path="/auth/kakao/callback" element={<KakaoCallback />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/" element={<PrivateRoute><div className="max-w-6xl mx-auto px-4 py-6"><Home /></div></PrivateRoute>} />
        <Route path="/events/create" element={<PrivateRoute><div className="max-w-6xl mx-auto px-4 py-6"><EventCreate /></div></PrivateRoute>} />
        <Route path="/events/:id" element={<div className="max-w-6xl mx-auto px-4 py-6"><EventDetail /></div>} />
        <Route path="/my-tickets" element={<PrivateRoute><div className="max-w-6xl mx-auto px-4 py-6"><MyTickets /></div></PrivateRoute>} />
        <Route path="/admin/schools" element={<OperatorRoute><SchoolManage /></OperatorRoute>} />
        <Route path="/admin/schools/:schoolId" element={<OperatorRoute><SchoolDetail /></OperatorRoute>} />
        <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
        <Route path="/school-admin" element={<SchoolAdminRoute><SchoolAdminDashboard /></SchoolAdminRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}

import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function SchoolAdminRoute({ children }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'SCHOOL_ADMIN') return <Navigate to="/" replace />
  return children
}

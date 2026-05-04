import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { getUnreadNotifications } from '../api/notifications'

export default function NotificationBell() {
  const navigate = useNavigate()

  const { data: unread = [] } = useQuery({
    queryKey: ['notifications-unread'],
    queryFn: getUnreadNotifications,
    refetchInterval: 30000,
  })

  const count = unread.length

  return (
    <button
      onClick={() => navigate('/notifications')}
      className="relative p-2 rounded-xl hover:bg-gray-50 transition"
      aria-label="알림"
    >
      <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
      {count > 0 && (
        <span className="absolute top-1 right-1 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-bold px-1">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  )
}

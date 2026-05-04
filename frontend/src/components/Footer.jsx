import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-gray-200 bg-white/60">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <img src="/logo6.png" alt="페스티켓 로고" className="h-7 w-auto opacity-80" />
            <span className="font-black text-primary-600 text-base tracking-tight">페스티켓</span>
          </div>

          <div className="flex items-center gap-6 text-sm text-gray-500">
            <Link to="/notices" className="hover:text-gray-800 transition">공지사항</Link>
            <Link to="/my-tickets" className="hover:text-gray-800 transition">내 티켓</Link>
            <Link to="/my-events" className="hover:text-gray-800 transition">내 행사</Link>
          </div>
        </div>

        <div className="flex items-center justify-between mt-6">
          <p className="text-xs text-gray-400">© 2026 페스티켓. All rights reserved.</p>
          <p className="text-xs text-gray-400">logo designed by JungEun Lee</p>
        </div>
      </div>
    </footer>
  )
}

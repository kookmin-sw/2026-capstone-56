import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { cancelPendingPayment } from '../api/payments'

export default function PaymentFail() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  useEffect(() => {
    const orderId = searchParams.get('orderId')
    if (orderId) cancelPendingPayment(orderId).catch(() => {})
  }, [])

  const errorMsg = searchParams.get('message') ?? '결제가 취소되었습니다.'

  return (
    <div className="max-w-md mx-auto mt-20 text-center space-y-4 px-4">
      <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center mx-auto">
        <svg className="w-7 h-7 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        </svg>
      </div>
      <h2 className="text-xl font-bold text-gray-900">결제 실패</h2>
      <p className="text-gray-500 text-sm">{errorMsg}</p>
      <button
        onClick={() => navigate(-2)}
        className="btn btn-primary px-6 py-2.5 rounded-xl text-sm font-semibold"
      >
        돌아가기
      </button>
    </div>
  )
}

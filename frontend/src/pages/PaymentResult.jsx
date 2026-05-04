import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { confirmPayment, cancelPendingPayment } from '../api/payments'

export default function PaymentResult() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState('processing')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const paymentKey = searchParams.get('paymentKey')
    const orderId = searchParams.get('orderId')
    const amount = Number(searchParams.get('amount'))

    if (paymentKey && orderId && amount) {
      confirmPayment({ paymentKey, orderId, amount })
        .then(() => {
          setStatus('success')
          setTimeout(() => navigate('/my-tickets', { replace: true }), 2000)
        })
        .catch((err) => {
          setStatus('error')
          setMessage(err.response?.data?.message ?? '결제 승인에 실패했습니다.')
        })
    } else {
      const orderId = searchParams.get('orderId')
      if (orderId) cancelPendingPayment(orderId).catch(() => {})
      setStatus('fail')
      setMessage(searchParams.get('message') ?? '결제가 취소되었습니다.')
    }
  }, [])

  return (
    <div className="max-w-md mx-auto mt-20 text-center space-y-4 px-4">
      {status === 'processing' && (
        <>
          <div className="w-14 h-14 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-600 font-medium">결제를 처리하는 중입니다...</p>
        </>
      )}
      {status === 'success' && (
        <>
          <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-7 h-7 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900">결제 완료!</h2>
          <p className="text-gray-500 text-sm">잠시 후 내 티켓 페이지로 이동합니다.</p>
        </>
      )}
      {(status === 'fail' || status === 'error') && (
        <>
          <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto ${status === 'fail' ? 'bg-amber-100' : 'bg-red-100'}`}>
            <svg className={`w-7 h-7 ${status === 'fail' ? 'text-amber-500' : 'text-red-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900">
            {status === 'fail' ? '결제 실패' : '결제 승인 실패'}
          </h2>
          <p className="text-gray-500 text-sm">{message}</p>
          <button
            onClick={() => navigate(-2)}
            className="btn btn-primary px-6 py-2.5 rounded-xl text-sm font-semibold"
          >
            돌아가기
          </button>
        </>
      )}
    </div>
  )
}

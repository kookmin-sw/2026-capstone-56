import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getRefundQueue, retryRefund } from '../api/payments'
import { useToast } from '../components/Toast'

function fmtDateTime(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const STATUS_CONFIG = {
  CANCELLATION_REQUESTED: { label: '환불 처리 중', color: 'bg-orange-100 text-orange-600' },
  REFUND_FAILED:          { label: '환불 실패',    color: 'bg-red-100 text-red-500' },
}

export default function AdminRefundQueue() {
  const toast = useToast()
  const queryClient = useQueryClient()

  const { data: queue = [], isLoading } = useQuery({
    queryKey: ['refund-queue'],
    queryFn: getRefundQueue,
    refetchInterval: 15000,
  })

  const retryMutation = useMutation({
    mutationFn: retryRefund,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['refund-queue'] })
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] })
      toast('환불 재시도가 완료되었습니다.', 'success')
    },
    onError: (err) => toast(err.response?.data?.message || '재시도에 실패했습니다.', 'error'),
  })

  const pending = queue.filter(r => r.status === 'CANCELLATION_REQUESTED').length
  const failed  = queue.filter(r => r.status === 'REFUND_FAILED').length

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <Link
        to="/admin"
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6 transition"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        운영자 대시보드
      </Link>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">환불 큐</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            처리 중 <span className="text-orange-500 font-semibold">{pending}건</span>
            {failed > 0 && <span className="ml-2 text-red-500 font-semibold">실패 {failed}건</span>}
          </p>
        </div>
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-primary-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : queue.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-gray-400 text-sm">처리 대기 중인 환불이 없습니다.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-5 py-3.5 font-medium text-gray-600">행사</th>
                <th className="text-left px-5 py-3.5 font-medium text-gray-600">신청자</th>
                <th className="text-left px-5 py-3.5 font-medium text-gray-600">상태</th>
                <th className="text-left px-5 py-3.5 font-medium text-gray-600">신청일</th>
                <th className="px-5 py-3.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {queue.map(r => {
                const cfg = STATUS_CONFIG[r.status] ?? { label: r.status, color: 'bg-gray-100 text-gray-500' }
                return (
                  <tr key={r.id} className="hover:bg-gray-50 transition">
                    <td className="px-5 py-4">
                      <div className="font-medium text-gray-900 line-clamp-1">{r.event?.title}</div>
                      {r.event?.deletedAt && (
                        <span className="text-xs text-red-400">삭제된 행사</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <div className="text-gray-800">{r.user?.name}</div>
                      <div className="text-xs text-gray-400">{r.user?.email}</div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cfg.color}`}>
                        {cfg.label}
                      </span>
                      {r.retryCount > 0 && (
                        <div className="text-xs text-gray-400 mt-0.5">재시도 {r.retryCount}회</div>
                      )}
                    </td>
                    <td className="px-5 py-4 text-gray-400 text-xs">{fmtDateTime(r.createdAt)}</td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => retryMutation.mutate(r.id)}
                        disabled={retryMutation.isPending}
                        className="text-xs font-medium text-primary-600 hover:underline disabled:opacity-50"
                      >
                        재시도
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getSchools, createSchool, updateSchool, deleteSchool } from '../api/schools'
import { useToast } from '../components/Toast'

function SchoolModal({ school, onClose }) {
  const toast = useToast()
  const queryClient = useQueryClient()
  const isEdit = !!school?.id

  const [form, setForm] = useState({
    name: school?.name || '',
    domain: school?.domain || '',
    address: school?.address || '',
  })

  const mutation = useMutation({
    mutationFn: (data) => isEdit ? updateSchool(school.id, data) : createSchool(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schools'] })
      toast(isEdit ? '학교 정보가 수정되었습니다.' : '학교가 등록되었습니다.', 'success')
      onClose()
    },
    onError: (err) => toast(err.response?.data?.message || '처리에 실패했습니다.', 'error'),
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.name || !form.domain) return toast('학교명과 이메일 도메인은 필수입니다.', 'error')
    mutation.mutate(form)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="card w-full max-w-md p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-5">
          {isEdit ? '학교 정보 수정' : '학교 등록'}
        </h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="label">학교명 *</label>
            <input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="숭실대학교"
              className="input"
            />
          </div>
          <div>
            <label className="label">이메일 도메인 *</label>
            <input
              value={form.domain}
              onChange={e => setForm(f => ({ ...f, domain: e.target.value }))}
              placeholder="ssu.ac.kr"
              className="input"
              disabled={isEdit}
            />
            {isEdit && <p className="text-xs text-gray-400 mt-1">도메인은 수정할 수 없습니다.</p>}
          </div>
          <div>
            <label className="label">주소 <span className="text-gray-400 font-normal">(선택)</span></label>
            <input
              value={form.address}
              onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
              placeholder="서울특별시 동작구 상도로 369"
              className="input"
            />
          </div>
          <div className="flex gap-2 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="btn-primary flex-1 justify-center"
            >
              {mutation.isPending ? '처리 중...' : isEdit ? '저장' : '등록'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function DeleteConfirmModal({ school, onClose }) {
  const toast = useToast()
  const queryClient = useQueryClient()
  const [input, setInput] = useState('')

  const mutation = useMutation({
    mutationFn: () => deleteSchool(school.id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['schools'] })
      toast(`학교가 삭제되었습니다. (영향 사용자: ${data.affectedUsers}명)`, 'success')
      onClose()
    },
    onError: (err) => toast(err.response?.data?.message || '삭제에 실패했습니다.', 'error'),
  })

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="card w-full max-w-md p-6">
        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-gray-900 mb-1">학교 삭제</h2>
        <p className="text-sm text-gray-500 mb-4">
          삭제하려면 아래에 <span className="font-semibold text-gray-700">{school.name}</span>을 입력하세요.
        </p>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={school.name}
          className="input mb-4"
        />
        <div className="flex gap-2">
          <button onClick={onClose} className="btn-secondary flex-1">취소</button>
          <button
            onClick={() => mutation.mutate()}
            disabled={input !== school.name || mutation.isPending}
            className="flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-40 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-all"
          >
            {mutation.isPending ? '삭제 중...' : '삭제'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function SchoolManage() {
  const navigate = useNavigate()
  const { data: schools = [], isLoading } = useQuery({ queryKey: ['schools'], queryFn: getSchools })
  const [modal, setModal] = useState(null) // null | { type: 'create' | 'edit' | 'delete', school? }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">학교 관리</h1>
          <p className="text-sm text-gray-500 mt-0.5">등록된 학교 {schools.length}개</p>
        </div>
        <button
          onClick={() => setModal({ type: 'create' })}
          className="btn-primary"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          학교 등록
        </button>
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-primary-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : schools.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-sm">등록된 학교가 없습니다.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-5 py-3.5 font-medium text-gray-600">학교명</th>
                <th className="text-left px-5 py-3.5 font-medium text-gray-600">이메일 도메인</th>
                <th className="text-left px-5 py-3.5 font-medium text-gray-600">주소</th>
                <th className="px-5 py-3.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {schools.map(school => (
                <tr key={school.id} className="hover:bg-gray-50 transition">
                  <td className="px-5 py-4 font-medium text-gray-900">
                    <button
                      onClick={() => navigate(`/admin/schools/${school.id}`)}
                      className="hover:text-primary-600 hover:underline transition"
                    >
                      {school.name}
                    </button>
                  </td>
                  <td className="px-5 py-4 text-gray-500">{school.domain}</td>
                  <td className="px-5 py-4 text-gray-400">{school.address || '-'}</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setModal({ type: 'edit', school })}
                        className="text-xs text-primary-600 hover:underline font-medium"
                      >
                        수정
                      </button>
                      <button
                        onClick={() => setModal({ type: 'delete', school })}
                        className="text-xs text-red-500 hover:underline font-medium"
                      >
                        삭제
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal?.type === 'create' && (
        <SchoolModal onClose={() => setModal(null)} />
      )}
      {modal?.type === 'edit' && (
        <SchoolModal school={modal.school} onClose={() => setModal(null)} />
      )}
      {modal?.type === 'delete' && (
        <DeleteConfirmModal school={modal.school} onClose={() => setModal(null)} />
      )}
    </div>
  )
}

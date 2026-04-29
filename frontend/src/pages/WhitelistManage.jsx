import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { getWhitelist, createWhitelist, addEntry, updateEntry, deleteEntry } from '../api/whitelist'
import { useToast } from '../components/Toast'

function EntryRow({ entry, schoolId, onEdit }) {
  const toast = useToast()
  const queryClient = useQueryClient()

  const del = useMutation({
    mutationFn: () => deleteEntry(schoolId, entry.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whitelist', schoolId] })
      toast('삭제되었습니다.', 'success')
    },
    onError: (err) => toast(err.response?.data?.message || '삭제에 실패했습니다.', 'error'),
  })

  const isDomain = entry.value.startsWith('@')

  return (
    <tr className="hover:bg-gray-50 transition">
      <td className="px-5 py-3.5">
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full mr-2 ${isDomain ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
          {isDomain ? '도메인' : '이메일'}
        </span>
        <span className="text-sm text-gray-800 font-mono">{entry.value}</span>
      </td>
      <td className="px-5 py-3.5 text-right">
        <div className="flex justify-end gap-3">
          <button onClick={() => onEdit(entry)} className="text-xs text-primary-600 hover:underline font-medium">수정</button>
          <button
            onClick={() => del.mutate()}
            disabled={del.isPending}
            className="text-xs text-red-500 hover:underline font-medium disabled:opacity-50"
          >
            삭제
          </button>
        </div>
      </td>
    </tr>
  )
}

function EntryForm({ schoolId, editing, onCancel }) {
  const toast = useToast()
  const queryClient = useQueryClient()
  const [value, setValue] = useState(editing?.value || '')

  const add = useMutation({
    mutationFn: () => addEntry(schoolId, value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whitelist', schoolId] })
      toast('항목이 추가되었습니다.', 'success')
      setValue('')
      onCancel()
    },
    onError: (err) => toast(err.response?.data?.message || '추가에 실패했습니다.', 'error'),
  })

  const edit = useMutation({
    mutationFn: () => updateEntry(schoolId, editing.id, value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whitelist', schoolId] })
      toast('수정되었습니다.', 'success')
      onCancel()
    },
    onError: (err) => toast(err.response?.data?.message || '수정에 실패했습니다.', 'error'),
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!value.trim()) return toast('값을 입력해주세요.', 'error')
    editing ? edit.mutate() : add.mutate()
  }

  const isPending = add.isPending || edit.isPending

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 mt-4">
      <input
        value={value}
        onChange={e => setValue(e.target.value)}
        placeholder="@kookmin.ac.kr 또는 student@kookmin.ac.kr"
        className="input flex-1 py-2 text-sm font-mono"
        autoFocus
      />
      <button type="submit" disabled={isPending} className="btn-primary py-2 text-sm">
        {isPending ? '처리 중...' : editing ? '저장' : '추가'}
      </button>
      <button type="button" onClick={onCancel} className="btn-secondary py-2 text-sm">취소</button>
    </form>
  )
}

export default function WhitelistManage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const toast = useToast()
  const queryClient = useQueryClient()
  const schoolId = user?.schoolId
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)

  const { data: whitelist, isLoading } = useQuery({
    queryKey: ['whitelist', schoolId],
    queryFn: () => getWhitelist(schoolId),
    enabled: !!schoolId,
  })

  const create = useMutation({
    mutationFn: () => createWhitelist(schoolId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whitelist', schoolId] })
      toast('화이트리스트가 생성되었습니다.', 'success')
    },
    onError: (err) => toast(err.response?.data?.message || '생성에 실패했습니다.', 'error'),
  })

  const handleEdit = (entry) => {
    setEditing(entry)
    setShowForm(true)
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditing(null)
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <button
        onClick={() => navigate('/school-admin')}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6 transition"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        대시보드로
      </button>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">화이트리스트 관리</h1>
          <p className="text-sm text-gray-400 mt-0.5">가입 허용 이메일 또는 도메인을 관리합니다</p>
        </div>
        {whitelist && !showForm && (
          <button onClick={() => setShowForm(true)} className="btn-primary">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            항목 추가
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-primary-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !whitelist ? (
        <div className="card p-10 text-center">
          <p className="text-gray-500 text-sm mb-4">화이트리스트가 아직 없습니다.<br />생성 후 항목을 추가할 수 있습니다.</p>
          <button onClick={() => create.mutate()} disabled={create.isPending} className="btn-primary justify-center">
            {create.isPending ? '생성 중...' : '화이트리스트 생성'}
          </button>
        </div>
      ) : (
        <div className="card overflow-hidden">
          {whitelist.entries.length === 0 && !showForm ? (
            <div className="text-center py-12 text-gray-400 text-sm">
              <p>등록된 항목이 없습니다.</p>
              <p className="mt-1 text-xs">항목을 추가하면 해당 이메일/도메인만 가입이 허용됩니다.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-5 py-3.5 font-medium text-gray-600">허용 이메일 / 도메인</th>
                  <th className="px-5 py-3.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {whitelist.entries.map(entry => (
                  <EntryRow key={entry.id} entry={entry} schoolId={schoolId} onEdit={handleEdit} />
                ))}
              </tbody>
            </table>
          )}

          {showForm && (
            <div className="px-5 pb-5 border-t border-gray-100 pt-4">
              <p className="text-xs text-gray-400 mb-1">
                도메인 형식 <span className="font-mono">@kookmin.ac.kr</span> 은 해당 도메인 전체를 허용합니다.
              </p>
              <EntryForm schoolId={schoolId} editing={editing} onCancel={handleCancel} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

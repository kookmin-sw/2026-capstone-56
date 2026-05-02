function getStrength(pw) {
  if (!pw) return null
  let score = 0
  if (pw.length >= 8) score++
  if (pw.length >= 12) score++
  if (/[a-zA-Z]/.test(pw) && /[0-9]/.test(pw)) score++
  if (/[^a-zA-Z0-9]/.test(pw)) score++

  if (score <= 1) return { label: '취약', bar: 'w-1/3 bg-red-400', text: 'text-red-500' }
  if (score <= 2) return { label: '보통', bar: 'w-2/3 bg-yellow-400', text: 'text-yellow-600' }
  return { label: '강함', bar: 'w-full bg-green-400', text: 'text-green-600' }
}

export default function PasswordStrength({ password }) {
  const strength = getStrength(password)
  if (!strength) return null

  return (
    <div className="mt-1.5 flex items-center gap-2">
      <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-300 ${strength.bar}`} />
      </div>
      <span className={`text-xs font-medium shrink-0 ${strength.text}`}>{strength.label}</span>
    </div>
  )
}

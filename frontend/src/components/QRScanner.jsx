import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

export default function QRScanner({ onScan }) {
  const [error, setError] = useState(null)
  const [scanning, setScanning] = useState(false)
  const scannerRef = useRef(null)
  const containerId = 'qr-scanner-container'

  useEffect(() => {
    const scanner = new Html5Qrcode(containerId)
    scannerRef.current = scanner

    scanner.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 250, height: 250 } },
      (decodedText) => { onScan(decodedText) },
      () => {}
    )
      .then(() => setScanning(true))
      .catch(() => setError('카메라 접근 권한이 필요합니다.\n브라우저 설정에서 카메라를 허용해주세요.'))

    return () => {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(() => {})
      }
    }
  }, [])

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        id={containerId}
        className="w-full max-w-sm rounded-2xl overflow-hidden border border-gray-200"
      />
      {error ? (
        <div className="w-full max-w-sm bg-red-50 border border-red-200 rounded-2xl p-4 text-center">
          <p className="text-sm text-red-600 whitespace-pre-line">{error}</p>
        </div>
      ) : !scanning ? (
        <p className="text-sm text-gray-400">카메라 초기화 중...</p>
      ) : (
        <p className="text-sm text-gray-500">카메라로 QR 코드를 스캔하세요</p>
      )}
    </div>
  )
}

const { releaseAll } = require('../services/releaseService')

let isRunning = false

async function processReleases() {
  if (isRunning) return
  isRunning = true
  try {
    const { results } = await releaseAll()
    const released = results.filter(r => r.released > 0)
    if (released.length > 0) {
      console.log(`[ReleaseWorker] ${released.length}개 행사 취소표 릴리즈 완료`)
    }
  } catch (err) {
    console.error('[ReleaseWorker] 처리 오류:', err.message)
  } finally {
    isRunning = false
  }
}

function start() {
  console.log('[ReleaseWorker] 시작 (60초 주기)')
  setInterval(processReleases, 60_000)
}

module.exports = { start }

const puppeteer = require('puppeteer')
const path = require('path')
const os = require('os')
const fs = require('fs')

function findHeadlessShellExe() {
  const cacheDir = path.join(os.homedir(), '.cache', 'puppeteer', 'chrome-headless-shell')
  if (!fs.existsSync(cacheDir)) return null
  const versions = fs.readdirSync(cacheDir).sort().reverse()
  for (const ver of versions) {
    const candidates = [
      path.join(cacheDir, ver, 'chrome-headless-shell-win64', 'chrome-headless-shell.exe'),
      path.join(cacheDir, ver, 'chrome-headless-shell-linux64', 'chrome-headless-shell'),
      path.join(cacheDir, ver, 'chrome-headless-shell-mac-arm64', 'chrome-headless-shell'),
      path.join(cacheDir, ver, 'chrome-headless-shell-mac-x64', 'chrome-headless-shell'),
    ]
    for (const exe of candidates) {
      if (fs.existsSync(exe)) return exe
    }
  }
  return null
}

async function launchBrowser() {
  const executablePath = findHeadlessShellExe()
  return puppeteer.launch({
    headless: true,
    ...(executablePath ? { executablePath } : {}),
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-extensions',
    ],
  })
}

module.exports = { launchBrowser }

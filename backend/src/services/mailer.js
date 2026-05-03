const nodemailer = require('nodemailer')
const QRCode = require('qrcode')

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS
  }
})

async function sendVerificationEmail({ to, name, verifyUrl }) {
  await transporter.sendMail({
    from: `"페스티켓" <${process.env.MAIL_USER}>`,
    to,
    subject: '[페스티켓] 이메일 인증을 완료해주세요',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2 style="color:#4a52e8">이메일 인증</h2>
        <p>안녕하세요, <strong>${name}</strong>님!</p>
        <p>아래 버튼을 클릭하면 이메일 인증이 완료됩니다.<br/>링크는 <strong>24시간</strong> 동안 유효합니다.</p>
        <a href="${verifyUrl}"
           style="display:inline-block;margin:20px 0;padding:12px 28px;background:#4a52e8;color:#fff;border-radius:10px;text-decoration:none;font-weight:bold">
          이메일 인증하기
        </a>
        <p style="color:#999;font-size:12px">본인이 요청하지 않은 경우 이 메일을 무시하세요.</p>
      </div>
    `
  })
}

async function sendPasswordResetEmail({ to, name, resetUrl }) {
  await transporter.sendMail({
    from: `"페스티켓" <${process.env.MAIL_USER}>`,
    to,
    subject: '[페스티켓] 비밀번호 재설정',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2 style="color:#4a52e8">비밀번호 재설정</h2>
        <p>안녕하세요, <strong>${name}</strong>님!</p>
        <p>비밀번호 재설정을 요청하셨습니다.<br/>아래 버튼을 클릭해 새 비밀번호를 설정하세요.</p>
        <p>링크는 <strong>1시간</strong> 동안 유효합니다.</p>
        <a href="${resetUrl}"
           style="display:inline-block;margin:20px 0;padding:12px 28px;background:#4a52e8;color:#fff;border-radius:10px;text-decoration:none;font-weight:bold">
          비밀번호 재설정하기
        </a>
        <p style="color:#999;font-size:12px">본인이 요청하지 않은 경우 이 메일을 무시하세요. 비밀번호는 변경되지 않습니다.</p>
      </div>
    `
  })
}

async function sendRegistrationConfirmEmail({ to, name, event, registrationId }) {
  const qrBuffer = await QRCode.toBuffer(registrationId, { width: 240, margin: 2 })

  const startAt = new Date(event.startAt).toLocaleString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit', weekday: 'short',
  })

  await transporter.sendMail({
    from: `"페스티켓" <${process.env.MAIL_USER}>`,
    to,
    subject: `[페스티켓] ${event.title} 신청이 완료되었습니다`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;color:#1f2937">
        <div style="background:#4a52e8;padding:28px 32px;border-radius:16px 16px 0 0">
          <h1 style="margin:0;color:#fff;font-size:20px">신청 완료</h1>
          <p style="margin:6px 0 0;color:#c7d2fe;font-size:13px">페스티켓</p>
        </div>
        <div style="background:#fff;padding:28px 32px;border:1px solid #e5e7eb;border-top:none">
          <p style="margin:0 0 20px">안녕하세요, <strong>${name}</strong>님!<br/>
          아래 행사 신청이 완료되었습니다.</p>

          <div style="background:#f9fafb;border-radius:12px;padding:20px 24px;margin-bottom:24px">
            <p style="margin:0 0 6px;font-size:18px;font-weight:700;color:#111827">${event.title}</p>
            <p style="margin:0 0 4px;font-size:13px;color:#6b7280">📅 ${startAt}</p>
            ${event.location ? `<p style="margin:0;font-size:13px;color:#6b7280">📍 ${event.location}</p>` : ''}
          </div>

          <p style="margin:0 0 12px;font-size:14px;font-weight:600;color:#374151;text-align:center">입장 QR 코드</p>
          <div style="text-align:center;margin-bottom:20px">
            <img src="cid:qr-code" alt="QR Code"
              style="width:180px;height:180px;border:1px solid #e5e7eb;border-radius:12px;padding:8px" />
          </div>
          <p style="margin:0 0 20px;font-size:12px;color:#9ca3af;text-align:center">
            입장 시 이 QR 코드를 제시해주세요.<br/>마이티켓 페이지에서도 확인할 수 있습니다.
          </p>

          <hr style="border:none;border-top:1px solid #f3f4f6;margin:0 0 16px"/>
          <p style="margin:0;font-size:11px;color:#d1d5db;text-align:center">
            본인이 신청하지 않은 경우 이 메일을 무시하세요.
          </p>
        </div>
      </div>
    `,
    attachments: [
      { filename: 'qr.png', content: qrBuffer, cid: 'qr-code' },
    ],
  })
}

module.exports = { sendVerificationEmail, sendPasswordResetEmail, sendRegistrationConfirmEmail }

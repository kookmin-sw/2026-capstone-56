const nodemailer = require('nodemailer')

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

module.exports = { sendVerificationEmail, sendPasswordResetEmail }

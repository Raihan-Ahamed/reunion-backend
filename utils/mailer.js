const QRCode = require('qrcode');

async function sendEmailViaBrevo(to, subject, html, attachmentBase64, attachmentName) {
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'api-key': process.env.BREVO_API_KEY,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      sender: { email: process.env.SENDER_EMAIL, name: 'Hazera Taju Reunion-2026' },
      to: [{ email: to }],
      subject,
      htmlContent: html,
      attachment: attachmentBase64 ? [{ content: attachmentBase64, name: attachmentName }] : undefined
    })
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error('Brevo email send failed: ' + err);
  }
}

async function sendTicketEmail(reg) {
  const verifyUrl = `${process.env.BASE_URL}/api/ticket/verify/${reg.ticketToken}`;
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, { margin: 1, width: 320 });
  const qrBase64 = qrDataUrl.split(',')[1];

  const html = `
  <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;border:1px solid #e2e2e2;border-radius:12px;overflow:hidden">
    <div style="background:#08172f;color:#fff;padding:20px;text-align:center">
      <h2 style="margin:0">Hazera Taju School & College</h2>
      <p style="margin:4px 0 0;letter-spacing:1px">REUNION - 2026</p>
    </div>
    <div style="padding:20px">
      <p>প্রিয় <b>${reg.fullName}</b>,</p>
      <p>আপনার পেমেন্ট যাচাই করা হয়েছে এবং আপনার রেজিস্ট্রেশন <b>কনফার্ম</b> করা হয়েছে।</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px">
        <tr><td style="padding:6px 0;color:#555">ব্যাচ</td><td style="padding:6px 0;text-align:right"><b>${reg.batch}</b></td></tr>
        <tr><td style="padding:6px 0;color:#555">ফোন</td><td style="padding:6px 0;text-align:right"><b>${reg.phone}</b></td></tr>
        <tr><td style="padding:6px 0;color:#555">অতিথি সংখ্যা</td><td style="padding:6px 0;text-align:right"><b>${reg.guestCount}</b></td></tr>
        <tr><td style="padding:6px 0;color:#555">টিকিট কোড</td><td style="padding:6px 0;text-align:right"><b>${reg.ticketToken}</b></td></tr>
      </table>
      <div style="text-align:center;margin:20px 0">
        <img src="data:image/png;base64,${qrBase64}" style="width:200px;height:200px" />
      </div>
      <p style="font-size:12px;color:#888;text-align:center">এই QR কোডটি একবারই ব্যবহারযোগ্য। অনুগ্রহ করে স্ক্রিনশট বা প্রিন্ট করে রাখুন।</p>
    </div>
  </div>`;

  await sendEmailViaBrevo(reg.email, 'আপনার রেজিস্ট্রেশন কনফার্ম হয়েছে — Reunion 2026 টিকিট', html);
}

async function sendRejectionEmail(reg, reason) {
  const html = `<p>প্রিয় ${reg.fullName},</p>
    <p>দুঃখিত, আপনার পেমেন্ট তথ্য যাচাই করা যায়নি${reason ? ' (' + reason + ')' : ''}। অনুগ্রহ করে সঠিক তথ্যসহ আবার যোগাযোগ করুন অথবা পুনরায় জমা দিন।</p>`;
  await sendEmailViaBrevo(reg.email, 'আপনার রেজিস্ট্রেশন সম্পর্কে তথ্য — Reunion 2026', html);
}

module.exports = { sendTicketEmail, sendRejectionEmail };
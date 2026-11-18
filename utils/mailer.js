const { Resend } = require('resend');
const QRCode = require('qrcode');

const resend = new Resend(process.env.RESEND_API_KEY);

// টিকিট ইমেইল পাঠানো — QR কোডসহ, ভেরিফিকেশন লিংক এমবেড করা থাকে
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
      <p>আপনার পেমেন্ট যাচাই করা হয়েছে এবং আপনার রেজিস্ট্রেশন <b>কনফার্ম</b> করা হয়েছে। নিচের টিকিট এবং QR কোডটি অনুষ্ঠানের দিন সাথে রাখুন — প্রবেশের সময় এটি স্ক্যান/যাচাই করা হবে।</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px">
        <tr><td style="padding:6px 0;color:#555">ব্যাচ</td><td style="padding:6px 0;text-align:right"><b>${reg.batch}</b></td></tr>
        <tr><td style="padding:6px 0;color:#555">ফোন</td><td style="padding:6px 0;text-align:right"><b>${reg.phone}</b></td></tr>
        <tr><td style="padding:6px 0;color:#555">অতিথি সংখ্যা</td><td style="padding:6px 0;text-align:right"><b>${reg.guestCount}</b></td></tr>
        <tr><td style="padding:6px 0;color:#555">টিকিট কোড</td><td style="padding:6px 0;text-align:right"><b>${reg.ticketToken}</b></td></tr>
      </table>
      <div style="text-align:center;margin:20px 0">
        <img src="cid:ticketqr" style="width:200px;height:200px" />
      </div>
      <p style="font-size:12px;color:#888;text-align:center">এই QR কোডটি একবারই ব্যবহারযোগ্য। অনুগ্রহ করে স্ক্রিনশট বা প্রিন্ট করে রাখুন।</p>
    </div>
  </div>`;

  await resend.emails.send({
    from: process.env.SMTP_FROM,
    to: reg.email,
    subject: 'আপনার রেজিস্ট্রেশন কনফার্ম হয়েছে — Reunion 2026 টিকিট',
    html,
    attachments: [{
      filename: 'ticket-qr.png',
      content: Buffer.from(qrBase64, 'base64'),
      cid: 'ticketqr'
    }]
  });
}

async function sendRejectionEmail(reg, reason) {
  await resend.emails.send({
    from: process.env.SMTP_FROM,
    to: reg.email,
    subject: 'আপনার রেজিস্ট্রেশন সম্পর্কে তথ্য — Reunion 2026',
    html: `<p>প্রিয় ${reg.fullName},</p>
           <p>দুঃখিত, আপনার পেমেন্ট তথ্য যাচাই করা যায়নি${reason ? ' (' + reason + ')' : ''}। অনুগ্রহ করে সঠিক তথ্যসহ আবার যোগাযোগ করুন অথবা পুনরায় জমা দিন।</p>`
  });
}

module.exports = { sendTicketEmail, sendRejectionEmail };
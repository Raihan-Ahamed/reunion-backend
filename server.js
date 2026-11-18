require('dotenv').config();
console.log('RESEND_API_KEY exists:', !!process.env.RESEND_API_KEY);
console.log('RESEND_API_KEY length:', process.env.RESEND_API_KEY ? process.env.RESEND_API_KEY.length : 0);
const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');

const Registration = require('./models/Registration');
const { sendTicketEmail, sendRejectionEmail } = require('./utils/mailer');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/admin', express.static(path.join(__dirname, 'public/admin')));

// ---------- DB ----------
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// ---------- Cloudinary (ছবি ও ডকুমেন্ট স্থায়ীভাবে রাখার জন্য) ----------
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// ফাইল মেমোরিতে রাখা হয় সাময়িকভাবে, ডিস্কে সেভ হয় না — তারপর সরাসরি Cloudinary-তে আপলোড হয়
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB per file
  fileFilter: (req, file, cb) => {
    const ok = /image\/(jpeg|jpg|png|webp)|application\/pdf/.test(file.mimetype);
    cb(ok ? null : new Error('শুধু ছবি (jpg/png/webp) অথবা PDF ফাইল গ্রহণযোগ্য'), ok);
  }
});

// একটা ফাইল বাফার থেকে Cloudinary-তে আপলোড করে, URL রিটার্ন করে
function uploadToCloudinary(fileBuffer, filename, resourceType = 'auto') {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'reunion2026', public_id: `${Date.now()}-${uuidv4()}`, resource_type: resourceType },
      (err, result) => err ? reject(err) : resolve(result.secure_url)
    );
    streamifier.createReadStream(fileBuffer).pipe(stream);
  });
}

// ---------- Admin auth middleware ----------
function requireAdmin(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'লগইন প্রয়োজন' });
  try {
    req.admin = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'সেশন মেয়াদোত্তীর্ণ, আবার লগইন করুন' });
  }
}

// ================= PUBLIC: Registration =================
app.post('/api/register',
  upload.fields([{ name: 'photo', maxCount: 1 }, { name: 'sscDocs', maxCount: 5 }]),
  async (req, res) => {
    try {
      const b = req.body;
      if (!req.files || !req.files.photo || !req.files.sscDocs) {
        return res.status(400).json({ error: 'ছবি এবং SSC ডকুমেন্ট আবশ্যক' });
      }

      let guests = [];
      if (b.guests) {
        try { guests = JSON.parse(b.guests); } catch { guests = []; }
      }

      // ছবি ও ডকুমেন্ট Cloudinary-তে আপলোড — এগুলো সার্ভার রিস্টার্ট/স্লিপেও হারাবে না
      const photoUrl = await uploadToCloudinary(req.files.photo[0].buffer, req.files.photo[0].originalname, 'image');
      const sscDocUrls = await Promise.all(
        req.files.sscDocs.map(f => uploadToCloudinary(f.buffer, f.originalname, 'auto'))
      );

      const reg = await Registration.create({
        fullName: b.fullName,
        batch: b.batch,
        phone: b.phone,
        email: b.email,
        sscRegNumber: b.sscRegNumber,
        photoPath: photoUrl,
        sscDocPaths: sscDocUrls,
        wantsPerform: b.wantsPerform === 'yes',
        performanceType: b.performanceType || '',
        performanceDetails: b.performanceDetails || '',
        guestCount: Number(b.guestCount) || 0,
        guests,
        bkashSenderNumber: b.bkashSenderNumber,
        bkashTxnLast4: b.bkashTxnLast4
      });

      res.status(201).json({
        message: 'রেজিস্ট্রেশন জমা হয়েছে। পেমেন্ট যাচাইয়ের পর ইমেইলে টিকিট পাঠানো হবে।',
        registrationId: reg._id
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'রেজিস্ট্রেশন ব্যর্থ হয়েছে, আবার চেষ্টা করুন' });
    }
  }
);

// ================= Admin: login =================
app.post('/api/admin/login', (req, res) => {
  const { email, password } = req.body;
  if (email !== process.env.ADMIN_EMAIL || password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'ভুল ইমেইল বা পাসওয়ার্ড' });
  }
  const token = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: '12h' });
  res.json({ token });
});

// ================= Admin: list / filter registrations =================
app.get('/api/admin/registrations', requireAdmin, async (req, res) => {
  const { status, search } = req.query;
  const q = {};
  if (status && status !== 'all') q.paymentStatus = status;
  if (search) {
    q.$or = [
      { fullName: new RegExp(search, 'i') },
      { phone: new RegExp(search, 'i') },
      { bkashSenderNumber: new RegExp(search, 'i') },
      { sscRegNumber: new RegExp(search, 'i') }
    ];
  }
  const list = await Registration.find(q).sort({ createdAt: -1 });
  res.json(list);
});

app.get('/api/admin/registrations/:id', requireAdmin, async (req, res) => {
  const reg = await Registration.findById(req.params.id);
  if (!reg) return res.status(404).json({ error: 'পাওয়া যায়নি' });
  res.json(reg);
});

// ================= Admin: approve (payment verified -> send ticket) =================
app.post('/api/admin/approve/:id', requireAdmin, async (req, res) => {
  try {
    const reg = await Registration.findById(req.params.id);
    if (!reg) return res.status(404).json({ error: 'পাওয়া যায়নি' });

    reg.paymentStatus = 'approved';
    reg.reviewedBy = req.admin.email;
    reg.reviewedAt = new Date();
    if (!reg.ticketToken) {
      reg.ticketToken = uuidv4();
      reg.ticketIssuedAt = new Date();
    }
    await reg.save();

    if (reg.email) {
      await sendTicketEmail(reg);
    }

    res.json({ message: 'অনুমোদন করা হয়েছে এবং টিকিট পাঠানো হয়েছে', registration: reg });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'অনুমোদন ব্যর্থ হয়েছে' });
  }
});

// ================= Admin: reject =================
app.post('/api/admin/reject/:id', requireAdmin, async (req, res) => {
  try {
    const reg = await Registration.findById(req.params.id);
    if (!reg) return res.status(404).json({ error: 'পাওয়া যায়নি' });

    reg.paymentStatus = 'rejected';
    reg.reviewedBy = req.admin.email;
    reg.reviewedAt = new Date();
    await reg.save();

    if (reg.email) await sendRejectionEmail(reg, req.body.reason);

    res.json({ message: 'বাতিল করা হয়েছে', registration: reg });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'বাতিল করা ব্যর্থ হয়েছে' });
  }
});

// ================= Ticket verify (entry gate scan) =================
// GET: শুধু তথ্য দেখায় (QR স্ক্যান করলে)
app.get('/api/ticket/verify/:token', async (req, res) => {
  const reg = await Registration.findOne({ ticketToken: req.params.token });
  if (!reg || reg.paymentStatus !== 'approved') {
    return res.status(404).send('<h2 style="font-family:sans-serif;color:#b00">❌ অবৈধ টিকিট</h2>');
  }
  res.send(`
    <div style="font-family:sans-serif;max-width:400px;margin:40px auto;text-align:center">
      <h2 style="color:${reg.checkedIn ? '#b00' : '#0a7'}">
        ${reg.checkedIn ? '⚠️ ইতিমধ্যে চেক-ইন হয়েছে' : '✅ বৈধ টিকিট'}
      </h2>
      <p><b>${reg.fullName}</b> — ব্যাচ ${reg.batch}</p>
      <p>ফোন: ${reg.phone} | অতিথি: ${reg.guestCount}</p>
      <p>লেনদেন শেষ ৪ ডিজিট: ${reg.bkashTxnLast4}</p>
      ${!reg.checkedIn
        ? `<form method="POST" action="/api/ticket/checkin/${reg.ticketToken}">
             <button style="padding:10px 20px;background:#08172f;color:#fff;border:none;border-radius:8px;font-size:16px">গেটে চেক-ইন করুন</button>
           </form>`
        : `<p style="color:#888">চেক-ইন সময়: ${reg.checkedInAt?.toLocaleString('bn-BD')}</p>`
      }
    </div>
  `);
});

// POST: গেটে একবার চেক-ইন মার্ক করা (ডুপ্লিকেট প্রবেশ ঠেকাতে)
app.post('/api/ticket/checkin/:token', async (req, res) => {
  const reg = await Registration.findOne({ ticketToken: req.params.token });
  if (!reg || reg.paymentStatus !== 'approved') {
    return res.status(404).send('<h2 style="font-family:sans-serif;color:#b00">❌ অবৈধ টিকিট</h2>');
  }
  if (!reg.checkedIn) {
    reg.checkedIn = true;
    reg.checkedInAt = new Date();
    await reg.save();
  }
  res.redirect(`/api/ticket/verify/${reg.ticketToken}`);
});

// ================= Public: bKash number (for the registration page to display) =================
app.get('/api/payment-info', (req, res) => {
  res.json({ bkashNumber: process.env.BKASH_NUMBER });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

# Hazera Taju Reunion-2026 — Backend

Node.js + Express + MongoDB backend, Cloudinary ফাইল স্টোরেজ, Admin Panel।

## ধাপে ধাপে পুরো প্রসেস (শুরু থেকে লাইভ পর্যন্ত)

### ধাপ ১ — MongoDB Atlas (ডাটাবেস)
1. https://www.mongodb.com/cloud/atlas -এ ফ্রি অ্যাকাউন্ট খোলো
2. একটা ফ্রি (M0) ক্লাস্টার বানাও
3. Database Access-এ একটা ইউজার বানাও (username/password মনে রাখো)
4. Network Access-এ `0.0.0.0/0` (Allow from anywhere) যোগ করো — কারণ Render-এর IP ফিক্সড না
5. "Connect" → "Drivers" থেকে connection string কপি করো, এটাই `MONGO_URI`

### ধাপ ২ — Cloudinary (ছবি/ডকুমেন্ট স্টোরেজ)
এটা জরুরি, কারণ Render ফ্রি টায়ারে সার্ভার ঘুমিয়ে গেলে/রিস্টার্ট হলে ডিস্কে রাখা ফাইল মুছে যায়। Cloudinary-তে রাখলে ছবি কখনো হারাবে না।
1. https://cloudinary.com -এ ফ্রি অ্যাকাউন্ট খোলো
2. Dashboard থেকে `Cloud Name`, `API Key`, `API Secret` কপি করো

### ধাপ ৩ — ইমেইল (Gmail App Password)
1. Google Account → Security → 2-Step Verification চালু করো
2. "App Passwords" থেকে একটা অ্যাপ পাসওয়ার্ড বানাও (এটাই `SMTP_PASS`, সাধারণ Gmail পাসওয়ার্ড না)

### ধাপ ৪ — ব্যাকএন্ড Render-এ ডিপ্লয়
1. এই `reunion-backend` ফোল্ডারটা একটা GitHub রিপোতে পুশ করো
2. https://render.com -এ "New Web Service" → তোমার GitHub রিপো সিলেক্ট করো
3. Build command: `npm install`, Start command: `npm start`
4. Environment ভ্যারিয়েবলগুলো (`.env.example`-এ যা আছে সব) Render-এর Environment ট্যাবে বসাও — `MONGO_URI`, `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `BKASH_NUMBER`, `SMTP_*`, `CLOUDINARY_*`
5. `BASE_URL` এ Render থেকে পাওয়া URL বসাও (যেমন `https://reunion-backend.onrender.com`)
6. ডিপ্লয় হয়ে গেলে টেস্ট করো: `https://reunion-backend.onrender.com/admin` খুলে লগইন করো

### ধাপ ৫ — ফ্রন্টএন্ড (তোমার HTML) Netlify-তে
1. HTML ফাইলের ফর্ম সাবমিট কোডে `fetch('/api/register')`-এর জায়গায় পুরো Render URL বসাও:
   `fetch('https://reunion-backend.onrender.com/api/register', { method:'POST', body: fd })`
2. বিকাশ নাম্বার হার্ডকোড না করে পেজ লোডে `fetch('https://reunion-backend.onrender.com/api/payment-info')` দিয়ে দেখাতে পারো
3. ফোল্ডারটা Netlify-তে ড্র্যাগ-ড্রপ করে বা GitHub রিপো কানেক্ট করে ডিপ্লয় করো

### ধাপ ৬ — টেস্ট
1. লাইভ সাইট থেকে একটা টেস্ট রেজিস্ট্রেশন জমা দাও
2. Render-এর `/admin` প্যানেলে ঢুকে দেখো এন্ট্রি এসেছে কিনা, ছবি দেখা যাচ্ছে কিনা
3. "অনুমোদন" দিয়ে দেখো ইমেইলে QR কোডসহ টিকিট আসছে কিনা
4. QR কোড স্ক্যান করে `/api/ticket/verify/:token` পেজ ঠিকমতো খুলছে কিনা, চেক-ইন বাটন কাজ করছে কিনা

## কাজের প্রবাহ (সংক্ষেপে)
ইউজার ফর্ম পূরণ করে → বিকাশে টাকা পাঠিয়ে শেষ ৪ ডিজিট বসায় → সব তথ্য + ছবি/ডকুমেন্ট MongoDB ও Cloudinary-তে জমা হয় (`pending`) → তুমি অ্যাডমিন প্যানেলে টাকা মিলিয়ে "অনুমোদন" দাও → ইউজারের ইমেইলে QR কোডসহ টিকিট চলে যায় → অনুষ্ঠানের দিন গেটে QR স্ক্যান করলে টিকিট বৈধতা ও চেক-ইন স্ট্যাটাস দেখায়, একই টিকিট দুইবার ব্যবহার আটকায়।

## ফর্মের ফিল্ড নাম (name attribute)
`fullName, batch, phone, email, sscRegNumber, photo (file), sscDocs (file, multiple), wantsPerform, performanceType, performanceDetails, guestCount, guests (JSON string), bkashSenderNumber, bkashTxnLast4`

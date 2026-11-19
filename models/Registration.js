const mongoose = require('mongoose');

const guestSchema = new mongoose.Schema({
  name: { type: String, trim: true },
  relation: { type: String, trim: true }
}, { _id: false });

const registrationSchema = new mongoose.Schema({
  fullName:        { type: String, required: true, trim: true },
  batch:           { type: String, required: true },
  phone:           { type: String, required: true },
  email:           { type: String, trim: true, lowercase: true },
  sscRegNumber:    { type: String, required: true },
  tshirtSize:      { type: String, required: true },

  photoPath:       { type: String, required: true },   // ছবি
  sscDocPaths:     [{ type: String, required: true }],  // SSC registration card / certificate (multiple files allowed)

  wantsPerform:    { type: Boolean, default: false },
  performanceType: { type: String },
  performanceDetails: { type: String },

  guestCount:      { type: Number, default: 0, max: 2 },
  guests:          [guestSchema],

  // বিকাশ পেমেন্ট তথ্য
  bkashSenderNumber: { type: String, required: true }, // যে নাম্বার থেকে টাকা পাঠানো হয়েছে
  bkashTxnLast4:     { type: String, required: true }, // ট্রানজেকশন আইডির শেষ ৪ ডিজিট

  paymentStatus:   { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  reviewedBy:      { type: String },
  reviewedAt:      { type: Date },

  ticketToken:     { type: String, unique: true, sparse: true },
  ticketIssuedAt:  { type: Date },
  checkedIn:       { type: Boolean, default: false },
  checkedInAt:     { type: Date }

}, { timestamps: true });

module.exports = mongoose.model('Registration', registrationSchema);

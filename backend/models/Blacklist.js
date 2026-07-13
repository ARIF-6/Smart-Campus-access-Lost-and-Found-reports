const mongoose = require('mongoose');

const blacklistSchema = new mongoose.Schema({
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: [true, 'Name is required']
  },
  studentId: {
    type: String,
    default: ''
  },
  qrCode: {
    type: String,
    default: ''
  },
  reason: {
    type: String,
    required: [true, 'Reason is required']
  },
  description: {
    type: String,
    default: ''
  },

  status: {
    type: String,
    enum: ['pending', 'in review', 'rejected', 'accepted'],
    default: 'pending'
  },
  isActive: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

module.exports = mongoose.model('Blacklist', blacklistSchema);

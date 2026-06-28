const mongoose = require('mongoose');

const visitorSchema = new mongoose.Schema({
  registeredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: [true, 'Visitor name is required']
  },
  visitorId: {
    type: Number
  },
  idNumber: {
    type: String,
    default: ''
  },
  phone: {
    type: String,
    default: ''
  },
  purpose: {
    type: String,
    required: [true, 'Purpose of visit is required']
  },
  hostName: {
    type: String,
    default: ''
  },
  hostStudentId: {
    type: String,
    default: ''
  },
  entryTime: {
    type: Date,
    default: Date.now
  },
  exitTime: {
    type: Date,
    default: null
  },
  status: {
    type: String,
    enum: ['inside', 'exited'],
    default: 'inside'
  }
}, { timestamps: true });

module.exports = mongoose.model('Visitor', visitorSchema);

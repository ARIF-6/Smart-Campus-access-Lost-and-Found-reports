const mongoose = require('mongoose');

const shiftSchema = new mongoose.Schema({
  guardId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  shiftStart: {
    type: Date,
    required: true
  },
  shiftEnd: {
    type: Date,
    default: null
  },
  status: {
    type: String,
    enum: ['active', 'completed'],
    default: 'active'
  },
  scansCount: {
    type: Number,
    default: 0
  },
  incidentsCount: {
    type: Number,
    default: 0
  },
  notes: {
    type: String,
    default: ''
  }
}, { timestamps: true });

module.exports = mongoose.model('Shift', shiftSchema);

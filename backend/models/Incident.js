const mongoose = require('mongoose');

const incidentSchema = new mongoose.Schema({
  reportedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: [true, 'Description is required']
  },
  evidenceImage: {
    type: String,
    default: null
  },
  location: {
    type: String,
    default: 'Main Gate'
  },
  personInvolved: {
    name: { type: String, default: '' },
    studentId: { type: String, default: '' },
    description: { type: String, default: '' }
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['pending', 'review', 'resolved'],
    default: 'pending'
  }
}, { timestamps: true });

module.exports = mongoose.model('Incident', incidentSchema);

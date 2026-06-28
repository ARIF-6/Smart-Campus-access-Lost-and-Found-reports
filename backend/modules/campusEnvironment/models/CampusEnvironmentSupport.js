const mongoose = require('mongoose');

const campusEnvironmentSupportSchema = new mongoose.Schema({
  complaint: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CampusEnvironmentComplaint',
    required: true
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Prevent duplicate support
campusEnvironmentSupportSchema.index({ complaint: 1, student: 1 }, { unique: true });

module.exports = mongoose.model('CampusEnvironmentSupport', campusEnvironmentSupportSchema);

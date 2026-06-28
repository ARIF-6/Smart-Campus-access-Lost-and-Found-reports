const mongoose = require('mongoose');

const campusEnvironmentTrackingSchema = new mongoose.Schema({
  complaint: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CampusEnvironmentComplaint',
    required: true
  },
  oldStatus: {
    type: String,
    required: true
  },
  newStatus: {
    type: String,
    required: true
  },
  changedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  note: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('CampusEnvironmentTracking', campusEnvironmentTrackingSchema);

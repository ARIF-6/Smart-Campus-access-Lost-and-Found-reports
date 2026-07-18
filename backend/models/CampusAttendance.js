const mongoose = require('mongoose');

const campusAttendanceSchema = new mongoose.Schema({
  studentId: {
    type: String,
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  campusId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campus',
    required: true
  },
  entryTime: {
    type: Date
  },
  exitTime: {
    type: Date
  },
  status: {
    type: String,
    enum: ['IN', 'OUT'],
    default: 'IN'
  },
  date: {
    type: String, // Format: YYYY-MM-DD
    required: true
  },
  // GPS Geofence details for auditing
  latitude: { type: Number },
  longitude: { type: Number },
  accuracy: { type: Number },
  distance: { type: Number }
}, { timestamps: true });

// Prevent duplicate attendance entry logs for a user on the same campus on the same day
campusAttendanceSchema.index({ userId: 1, campusId: 1, date: 1 }, { unique: false });

module.exports = mongoose.model('CampusAttendance', campusAttendanceSchema);

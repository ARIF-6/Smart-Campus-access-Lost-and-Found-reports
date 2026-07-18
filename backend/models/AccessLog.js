const mongoose = require('mongoose');

const accessLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
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
    enum: ["IN", "OUT"],
    default: "IN"
  },
  campus: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campus',
    default: null
  },
  scannedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  source: {
    type: String,
    enum: ['Security Guard', 'Campus QR Code'],
    default: 'Security Guard'
  },
  // GPS Geofence details for auditing
  latitude: { type: Number },
  longitude: { type: Number },
  accuracy: { type: Number },
  distance: { type: Number }
}, { timestamps: true });

module.exports = mongoose.model('AccessLog', accessLogSchema);

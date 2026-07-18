const mongoose = require('mongoose');

const CampusSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  locationLink: { type: String, default: '' },
  latitude: { type: Number, default: null },
  longitude: { type: Number, default: null },
  radius: { type: Number, default: 120 },
  qrCode: { type: String },
  qrGeneratedAt: { type: Date },
  qrExpiresAt: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('Campus', CampusSchema);

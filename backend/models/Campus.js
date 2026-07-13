const mongoose = require('mongoose');

const CampusSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  qrCode: { type: String },
  qrGeneratedAt: { type: Date },
  qrExpiresAt: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('Campus', CampusSchema);

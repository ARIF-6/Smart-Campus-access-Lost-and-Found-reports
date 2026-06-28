const mongoose = require('mongoose');

const CampusSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true }
}, { timestamps: true });

module.exports = mongoose.model('Campus', CampusSchema);

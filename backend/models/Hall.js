const mongoose = require('mongoose');

const HallSchema = new mongoose.Schema({
  name: { type: String, required: true },
  classes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Class' }],
  campus: { type: mongoose.Schema.Types.ObjectId, ref: 'Campus', required: true },
  capacity: { type: Number },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Hall', HallSchema);

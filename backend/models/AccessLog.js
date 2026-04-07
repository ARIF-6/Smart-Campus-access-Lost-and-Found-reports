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
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('AccessLog', accessLogSchema);

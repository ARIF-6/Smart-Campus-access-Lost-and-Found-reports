const mongoose = require('mongoose');

const dailyNoExitReportSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
    unique: true
  },
  students: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    fullName: String,
    studentId: String,
    entryTime: Date
  }],
  totalNoExit: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

module.exports = mongoose.model('DailyNoExitReport', dailyNoExitReportSchema);

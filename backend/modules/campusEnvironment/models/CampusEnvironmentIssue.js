const mongoose = require('mongoose');

const campusEnvironmentIssueSchema = new mongoose.Schema({
  issueName: {
    type: String,
    required: true,
    unique: true
  },
  category: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('CampusEnvironmentIssue', campusEnvironmentIssueSchema);

const mongoose = require('mongoose');

const campusEnvironmentComplaintSchema = new mongoose.Schema({
  issueType: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CampusEnvironmentIssue',
    required: true
  },
  // Title submitted by student
  title: {
    type: String,
    required: true,
    trim: true
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  description: {
    type: String,
    required: true
  },
  images: [{
    type: String
  }],
  faculty: String,
  department: String,
  class: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', default: null },
  hall: { type: mongoose.Schema.Types.ObjectId, ref: 'Hall', default: null },
  campus: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campus',
    default: null
  },
  location: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'in_review', 'resolved', 'completed', 'rejected'],
    default: 'pending'
  },
  supportCount: {
    type: Number,
    default: 0
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for performance
campusEnvironmentComplaintSchema.index({ status: 1, title: 1, location: 1 });
campusEnvironmentComplaintSchema.index({ student: 1 });
campusEnvironmentComplaintSchema.index({ campus: 1 });

module.exports = mongoose.model('CampusEnvironmentComplaint', campusEnvironmentComplaintSchema);

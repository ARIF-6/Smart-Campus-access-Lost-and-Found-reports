const mongoose = require('mongoose');

const classIssueTypeSchema = new mongoose.Schema({
  issueName: { type: String, required: true, unique: true },
  category: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const ClassIssueType = mongoose.model('ClassIssueType', classIssueTypeSchema);

const classIssueComplaintSchema = new mongoose.Schema({
  issueType: { type: mongoose.Schema.Types.ObjectId, ref: 'ClassIssueType', required: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  images: [{ type: String }],
  faculty: { type: String },
  department: { type: String },
  classId: { type: String, default: null },   // the class this issue belongs to
  className: { type: String, default: '' },
  classroom: { type: String, required: true },
  building: { type: String, required: true },
  status: {
    type: String,
    enum: ['pending', 'in_review', 'resolved', 'rejected'],
    default: 'pending'
  },
  supportCount: { type: Number, default: 0 },
  supportedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});

// Indexes for performance
classIssueComplaintSchema.index({ status: 1 });
classIssueComplaintSchema.index({ student: 1 });
classIssueComplaintSchema.index({ faculty: 1 });
classIssueComplaintSchema.index({ classId: 1 });

const ClassIssueComplaint = mongoose.model('ClassIssueComplaint', classIssueComplaintSchema);

const classIssueTrackingSchema = new mongoose.Schema({
  complaint: { type: mongoose.Schema.Types.ObjectId, ref: 'ClassIssueComplaint', required: true },
  oldStatus: { type: String, required: true },
  newStatus: { type: String, required: true },
  changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  note: { type: String },
  createdAt: { type: Date, default: Date.now }
});

const ClassIssueTracking = mongoose.model('ClassIssueTracking', classIssueTrackingSchema);

module.exports = {
  ClassIssueType,
  ClassIssueComplaint,
  ClassIssueTracking
};

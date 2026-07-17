const mongoose = require('mongoose');

const foundItemSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true
  },
  location: {
    type: String,
    required: true
  },
  dateFound: {
    type: Date,
    default: Date.now
  },
  image: {
    type: String,
    default: ''
  },
  imageUrl: {
    type: String
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  possibleMatch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LostItem',
    default: null
  },
  status: {
    type: String,
    enum: ["pending","in review","approved","rejected","claimed","returned","under_ownership_review"],
    default: 'pending'
  },
  currentReturnedStudent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  activeDispute: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'OwnershipDispute',
    default: null
  },
  storageLocation: {
    type: String,
    default: ''
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'low'
  },
  notes: {
    type: String,
    default: ''
  },
  comments: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    comment: {
      type: String,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date,
    default: null
  },
  returnedAt: {
    type: Date,
    default: null
  },
  returnedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true
});

foundItemSchema.index({ category: 1 });
foundItemSchema.index({ status: 1 });
foundItemSchema.index({ location: 1 });
foundItemSchema.index({ createdBy: 1 });
foundItemSchema.index({ isDeleted: 1 });
foundItemSchema.index({ createdAt: -1 });

module.exports = mongoose.model('FoundItem', foundItemSchema);

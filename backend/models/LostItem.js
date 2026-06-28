const mongoose = require('mongoose');

const lostItemSchema = new mongoose.Schema({
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
  dateLost: {
    type: Date,
    default: Date.now
  },
  image: {
    type: String
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
  linkedFoundItem: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FoundItem',
    default: null
  },
  status: {
    type: String,
    enum: ["pending","approved","rejected","claimed","returned"],
    default: 'pending'
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

lostItemSchema.index({ title: 1 });
lostItemSchema.index({ category: 1 });
lostItemSchema.index({ status: 1 });
lostItemSchema.index({ location: 1 });
lostItemSchema.index({ createdBy: 1 });
lostItemSchema.index({ isDeleted: 1 });
lostItemSchema.index({ createdAt: -1 });

module.exports = mongoose.model('LostItem', lostItemSchema);

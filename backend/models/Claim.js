const mongoose = require('mongoose');

const claimSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  item: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'itemModel',
    required: true
  },
  itemType: {
    type: String,
    enum: ["lost", "found"],
    required: true
  },
  itemModel: {
    type: String,
    enum: ["LostItem", "FoundItem"]
  },
  message: {
    type: String,
    required: true
  },
  proofImage: {
    type: String,
    default: null
  },
  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending"
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

claimSchema.index({ user: 1 });
claimSchema.index({ item: 1 });
claimSchema.index({ status: 1 });
claimSchema.index({ isDeleted: 1 });
claimSchema.index({ createdAt: -1 });

claimSchema.pre('validate', function() {
  if (this.itemType === 'lost') {
    this.itemModel = 'LostItem';
  } else if (this.itemType === 'found') {
    this.itemModel = 'FoundItem';
  }
});

module.exports = mongoose.model('Claim', claimSchema);

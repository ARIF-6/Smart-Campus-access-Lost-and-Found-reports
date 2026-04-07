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
  locationLost: {
    type: String,
    required: true
  },
  dateLost: {
    type: Date,
    required: true
  },
  image: {
    type: String
  },
  imageUrl: {
    type: String
  },
  reportedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['lost', 'matched', 'returned'],
    default: 'lost'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('LostItem', lostItemSchema);

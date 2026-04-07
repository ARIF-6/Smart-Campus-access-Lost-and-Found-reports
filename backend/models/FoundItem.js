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
  locationFound: {
    type: String,
    required: true
  },
  dateFound: {
    type: Date,
    required: true
  },
  image: {
    type: String,
    default: ''
  },
  imageUrl: {
    type: String
  },
  reportedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  possibleMatch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LostItem',
    default: null
  },
  status: {
    type: String,
    enum: ["FOUND", "CLAIMED"],
    default: "FOUND"
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('FoundItem', foundItemSchema);

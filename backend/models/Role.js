const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a role name'],
    unique: true,
    lowercase: true,
    trim: true
  },
  displayName: {
    type: String,
    required: [true, 'Please add a display name'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  color: {
    type: String,
    default: 'bg-gray-100 text-gray-800'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Role', roleSchema);

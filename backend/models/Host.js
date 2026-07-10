const mongoose = require('mongoose');

const HostSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    faculty: { type: String, trim: true, default: '' },
    campus: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

// Unique index to prevent duplicate hosts in the same campus
HostSchema.index(
  { name: 1, campus: 1 },
  { unique: true, collation: { locale: 'en', strength: 2 } }
);

module.exports = mongoose.model('Host', HostSchema);

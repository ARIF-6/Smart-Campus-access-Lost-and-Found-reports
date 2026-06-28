const mongoose = require('mongoose');

const CategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    categoryType: {
      type: String,
      required: true,
      enum: ['campus', 'class', 'lostfound', 'campus_issue', 'class_issue', 'lost_found', 'incident'],
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    isTemporary: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

// case‑insensitive unique index on name + categoryType
CategorySchema.index(
  { name: 1, categoryType: 1 },
  { unique: true, collation: { locale: 'en', strength: 2 } }
);

module.exports = mongoose.model('Category', CategorySchema);

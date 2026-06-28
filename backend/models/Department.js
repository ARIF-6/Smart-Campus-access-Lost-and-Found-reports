const mongoose = require('mongoose');

const DepartmentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, default: '' },
  facultyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Faculty', required: true }
}, { timestamps: true });

module.exports = mongoose.model('Department', DepartmentSchema);

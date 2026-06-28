const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: [true, 'Please add a full name']
  },
  name: {
    type: String
  },
  username: {
    type: String,
    unique: true,
    sparse: true,
    trim: true
  },
  password: {
    type: String,
    required: [true, 'Please add a password'],
    minlength: 6,
    select: false
  },
  role: {
    type: String,
    default: "student"
  },
  phone: {
    type: String
  },
  address: {
    type: String
  },
  plainPassword: {
    type: String
  },
  studentId: {
    type: String,
    unique: true,
    sparse: true,
    trim: true
  },
  parentNumber: {
    type: String,
    trim: true
  },
  qrCode: {
    type: String,
    unique: true,
    sparse: true // Allows multiple null/undefined values
  },
  photoUrl: {
    type: String,
    default: ''
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  deletedAt: {
    type: Date,
    default: null
  },
  faculty: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Faculty',
    default: null,
    set: v => v === '' ? null : v
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    default: null,
    set: v => v === '' ? null : v
  },
  class: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    default: null,
    set: v => v === '' ? null : v
  },
  isClassLeader: {
    type: Boolean,
    default: false
  },
  campus: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campus',
    default: null,
    set: v => v === '' ? null : v
  },
  assignedShift: {
    type: String,
    enum: ['morning', 'afternoon', 'none'],
    default: 'none'
  },
  shiftStartTime: {
    type: String,
    default: ''
  },
  shiftEndTime: {
    type: String,
    default: ''
  },
  academicYear: {
    type: String,
    default: '25/26'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    set: v => v === '' ? null : v
  }
}, {
  timestamps: true
});

// Added for performance
userSchema.index({ fullName: 1 });
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ faculty: 1 });
userSchema.index({ department: 1 });
userSchema.index({ campus: 1 });

// Compatibility hook for legacy documents
userSchema.pre('validate', function () {
  if (!this.fullName && this.name) {
    this.fullName = this.name;
  }
});

// Hash password before saving
userSchema.pre('save', async function () {
  if (!this.isModified('password')) {
    return;
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Match user entered password to hashed password in database
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);

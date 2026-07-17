const mongoose = require('mongoose');
const User = require('./backend/models/User');
require('dotenv').config({ path: './backend/.env' });

async function test() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');
  const search = '';
  const filter = {
    role: 'student',
    isDeleted: { $ne: true },
    isActive: { $ne: false }
  };
  const students = await User
    .find(filter)
    .select('_id fullName studentId photoUrl faculty department class')
    .populate('faculty',    'name')
    .populate('department', 'name')
    .populate('class',      'name')
    .sort({ fullName: 1 })
    .limit(100)
    .lean();
  console.log('Fetched students count:', students.length);
  if (students.length > 0) {
    console.log('First student:', students[0]);
  }
  await mongoose.disconnect();
}

test().catch(console.error);

require('dotenv').config();
const mongoose = require('mongoose');
const ClassModel = require('./models/Class');
const User = require('./models/User');
const Hall = require('./models/Hall');
const Department = require('./models/Department');
const Faculty = require('./models/Faculty');

const testGetClassStudents = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('DB Connected!');
    
    const students = await User.find({ role: 'student' }).select('fullName studentId isDeleted isActive').limit(20).lean();
    console.log('Total students in DB matching role student:', students.length);
    console.log('Students:', students);

  } catch (err) {
    console.error('Error testing:', err);
  } finally {
    await mongoose.disconnect();
  }
};

testGetClassStudents();

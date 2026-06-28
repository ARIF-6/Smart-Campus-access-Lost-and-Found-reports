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
    
    // Find a class
    const cls = await ClassModel.findOne();
    if (!cls) {
      console.log('No class found in DB');
      return;
    }
    console.log('Found Class:', cls.name, 'with ID:', cls._id);

    const classId = cls._id;
    const classDetail = await ClassModel.findById(classId)
      .populate('classLeader', 'fullName email studentId')
      .populate({
        path: 'departmentId',
        select: 'name facultyId',
        populate: { path: 'facultyId', select: 'name' }
      })
      .lean();
    if (!classDetail) {
      console.log('Class detail not found');
      return;
    }
    console.log('Class Detail fetched successfully');

    const assignedHall = await Hall.findOne({ class: classId })
      .select('name campus capacity class')
      .populate('campus', 'name')
      .lean();
    console.log('Assigned Hall:', assignedHall);

    const students = await User.find({
      role: 'student',
      isDeleted: { $ne: true },
      $or: [
        { class: classId },
        { department: classDetail.name }
      ]
    })
      .select('fullName email studentId phone isClassLeader isActive photoUrl class')
      .populate('class', 'name academicYear')
      .lean();
    console.log('Found Students:', students.length);

  } catch (err) {
    console.error('Error testing getClassStudents:', err);
  } finally {
    await mongoose.disconnect();
  }
};

testGetClassStudents();

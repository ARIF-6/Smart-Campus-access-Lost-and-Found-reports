require('dotenv').config();
const mongoose = require('mongoose');
const { ClassIssueComplaint } = require('./modules/classIssues/models/classIssueModels');
const Hall = require('./models/Hall');
const Faculty = require('./models/Faculty');
const Department = require('./models/Department');

// The attachNames function from classIssueController.js
async function attachNames(issues) {
  const classIds = [...new Set(issues.map(i => i.classId).filter(Boolean))];
  const facultyIds = [...new Set(issues.flatMap(i => [i.faculty, i.student?.faculty]).filter(id => id && mongoose.Types.ObjectId.isValid(id)))];
  const deptIds = [...new Set(issues.flatMap(i => [i.department, i.student?.department]).filter(id => id && mongoose.Types.ObjectId.isValid(id)))];

  const [halls, faculties, departments] = await Promise.all([
    classIds.length ? Hall.find({ class: { $in: classIds } }).select('name class').lean() : [],
    facultyIds.length ? Faculty.find({ _id: { $in: facultyIds } }).select('name').lean() : [],
    deptIds.length ? Department.find({ _id: { $in: deptIds } }).select('name').lean() : []
  ]);

  const hallMap = {}, facultyMap = {}, deptMap = {};
  halls.forEach(h => hallMap[h.class.toString()] = h.name);
  faculties.forEach(f => facultyMap[f._id.toString()] = f.name);
  departments.forEach(d => deptMap[d._id.toString()] = d.name);

  return issues.map(issue => {
    let student = issue.student;
    if (student) {
      student = { ...student };
      if (facultyMap[student.faculty]) student.faculty = facultyMap[student.faculty];
      if (deptMap[student.department]) student.department = deptMap[student.department];
    }
    return {
      ...issue,
      student,
      faculty: facultyMap[issue.faculty] || issue.faculty,
      department: deptMap[issue.department] || issue.department,
      hallName: issue.classId ? (hallMap[issue.classId] || issue.building || null) : (issue.building || null),
    };
  });
}

const testAttachNames = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('DB Connected!');
    const issues = await ClassIssueComplaint.find()
      .populate('student', 'fullName studentId email phone faculty department')
      .populate('assignedTo', 'fullName')
      .populate('issueType', 'issueName category')
      .lean();
    console.log('Found Class Issues:', issues.length);
    const resolved = await attachNames(issues);
    console.log('attachNames ran successfully for all issues!');
  } catch (err) {
    console.error('Error during testAttachNames:', err);
  } finally {
    await mongoose.disconnect();
  }
};

testAttachNames();

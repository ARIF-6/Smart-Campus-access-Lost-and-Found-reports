const mongoose = require('mongoose');
require('dotenv').config();

const Faculty = require('../models/Faculty');
const Department = require('../models/Department');
const Class = require('../models/Class');

const diagnose = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // 1. Check Faculties
    const faculties = await Faculty.find().lean();
    console.log(`\n=== FACULTIES (${faculties.length}) ===`);
    faculties.forEach(f => console.log(`  [${f._id}] ${f.name}`));

    // 2. Check Departments
    const departments = await Department.find().lean();
    console.log(`\n=== DEPARTMENTS (${departments.length}) ===`);
    for (const d of departments) {
      const fac = await Faculty.findById(d.facultyId).lean();
      console.log(`  [${d._id}] ${d.name} -> facultyId: ${d.facultyId} -> ${fac ? fac.name : '*** NOT FOUND ***'}`);
    }

    // 3. Check Classes
    const classes = await Class.find().lean();
    console.log(`\n=== CLASSES (${classes.length}) ===`);
    for (const c of classes) {
      const dept = await Department.findById(c.departmentId).lean();
      let facName = '*** NOT FOUND ***';
      if (dept) {
        const fac = await Faculty.findById(dept.facultyId).lean();
        facName = fac ? fac.name : '*** NOT FOUND ***';
      }
      console.log(`  [${c._id}] ${c.name} -> departmentId: ${c.departmentId} -> ${dept ? dept.name : '*** NOT FOUND ***'} -> Faculty: ${facName}`);
    }

    // 4. Test populate chain
    console.log('\n=== POPULATE TEST ===');
    const populatedClasses = await Class.find().populate({
      path: 'departmentId',
      populate: { path: 'facultyId', select: 'name' }
    }).lean();
    populatedClasses.forEach(c => {
      const deptName = c.departmentId?.name || 'NULL';
      const facName = c.departmentId?.facultyId?.name || 'NULL';
      console.log(`  ${c.name}: dept=${deptName}, faculty=${facName}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Diagnosis error:', error);
    process.exit(1);
  }
};

diagnose();

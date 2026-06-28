require('dotenv').config();
const mongoose = require('mongoose');
const Faculty = require('../models/Faculty');
const Department = require('../models/Department');
const Class = require('../models/Class');

async function run() {
  await require('../config/db')();
  console.log('Connected to MongoDB');

  const firstFaculty = await Faculty.findOne();
  if (!firstFaculty) {
    console.error('No faculty found.');
    process.exit(1);
  }
  const firstDept = await Department.findOne();
  if (!firstDept) {
    console.error('No department found.');
    process.exit(1);
  }

  // Fix departments missing facultyId
  const deptResult = await Department.updateMany(
    { $or: [{ facultyId: { $exists: false } }, { facultyId: null }] },
    { $set: { facultyId: firstFaculty._id } }
  );
  console.log(`Updated ${deptResult.modifiedCount} departments.`);

  // Fix classes missing departmentId
  const classResult = await Class.updateMany(
    { $or: [{ departmentId: { $exists: false } }, { departmentId: null }] },
    { $set: { departmentId: firstDept._id } }
  );
  console.log(`Updated ${classResult.modifiedCount} classes.`);

  console.log('Migration complete');
  process.exit(0);
}

run().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});

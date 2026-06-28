const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/campus_access').then(async () => {
  const db = mongoose.connection.db;
  const complaints = await db.collection('classissuecomplaints').find({ classId: { $exists: false } }).toArray();
  for (let c of complaints) {
    if (c.student) {
      const student = await db.collection('users').findOne({ _id: c.student });
      if (student && student.class) {
        await db.collection('classissuecomplaints').updateOne(
          { _id: c._id },
          { $set: { classId: student.class.toString(), className: '' } }
        );
        console.log('Updated issue ' + c._id + ' with classId ' + student.class.toString());
      }
    }
  }
  
  // also fix the ones with classId: null if any
  const nullComplaints = await db.collection('classissuecomplaints').find({ classId: null }).toArray();
  for (let c of nullComplaints) {
    if (c.student) {
      const student = await db.collection('users').findOne({ _id: c.student });
      if (student && student.class) {
        await db.collection('classissuecomplaints').updateOne(
          { _id: c._id },
          { $set: { classId: student.class.toString(), className: '' } }
        );
        console.log('Updated null issue ' + c._id + ' with classId ' + student.class.toString());
      }
    }
  }
  
  console.log('Done migrating old issues.');
  process.exit(0);
});

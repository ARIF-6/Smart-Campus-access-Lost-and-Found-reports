const mongoose = require('mongoose');
require('dotenv').config();

const diagnoseRaw = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Get raw documents directly from MongoDB (bypass Mongoose schema)
    const db = mongoose.connection.db;

    console.log('\n=== RAW DEPARTMENTS ===');
    const rawDepts = await db.collection('departments').find({}).toArray();
    rawDepts.forEach(d => console.log(JSON.stringify(d, null, 2)));

    console.log('\n=== RAW CLASSES ===');
    const rawClasses = await db.collection('classes').find({}).toArray();
    rawClasses.forEach(c => console.log(JSON.stringify(c, null, 2)));

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

diagnoseRaw();

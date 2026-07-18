const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  console.log('Connected to MongoDB');
  const Campus = require('./models/Campus');
  const campuses = await Campus.find();
  console.log('Campuses in DB:');
  console.log(JSON.stringify(campuses, null, 2));
  await mongoose.disconnect();
}

run().catch(console.error);

const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');
const FoundItem = require('./models/FoundItem');

async function run() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/campus-access');
  console.log('Connected to DB');
  
  const item = await FoundItem.findById('6a533b32df580860d81c0fd9').populate('createdBy').lean();
  console.log('Item details:', JSON.stringify(item, null, 2));

  await mongoose.connection.close();
}

run().catch(console.error);

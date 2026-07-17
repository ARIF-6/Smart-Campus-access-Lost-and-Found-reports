const mongoose = require('mongoose');
require('dotenv').config();

const FoundItem = require('./models/FoundItem');

async function run() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/campus-access');
  console.log('Connected to DB');
  
  const items = await FoundItem.find({ isDeleted: { $ne: true } }).lean();
  console.log('Found Items:');
  items.forEach(item => {
    console.log(`ID: ${item._id}`);
    console.log(`Title: ${item.title}`);
    console.log(`Status: ${item.status}`);
    console.log(`Image: ${item.image}`);
    console.log(`ImageUrl: ${item.imageUrl}`);
    console.log(`ReturnedAt: ${item.returnedAt}`);
    console.log(`CreatedAt: ${item.createdAt}`);
    console.log('---');
  });

  await mongoose.connection.close();
}

run().catch(console.error);

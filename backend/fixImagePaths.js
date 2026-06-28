const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

async function fixImagePaths() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    const LostItem = mongoose.connection.collection('lostitems');
    const FoundItem = mongoose.connection.collection('founditems');

    let updated = 0;

    // Fix Lost Items - update directly in MongoDB (bypass Mongoose validation)
    const lostItems = await LostItem.find({}).toArray();
    for (let item of lostItems) {
      if (item.image) {
        const oldPath = item.image;
        const filename = path.basename(item.image);
        
        await LostItem.updateOne(
          { _id: item._id },
          { $set: { image: filename } }
        );
        
        console.log(`✓ Lost Item "${item.title}": ${oldPath} -> ${filename}`);
        updated++;
      }
    }

    // Fix Found Items
    const foundItems = await FoundItem.find({}).toArray();
    for (let item of foundItems) {
      if (item.image) {
        const oldPath = item.image;
        const filename = path.basename(item.image);
        
        await FoundItem.updateOne(
          { _id: item._id },
          { $set: { image: filename } }
        );
        
        console.log(`✓ Found Item "${item.title}": ${oldPath} -> ${filename}`);
        updated++;
      }
    }

    console.log(`\n✅ Fixed ${updated} items\n`);
    console.log('📋 Sample items:');
    
    const samples = await LostItem.find({}).project({ title: 1, image: 1 }).limit(3).toArray();
    samples.forEach(item => {
      console.log(`  - ${item.title}: ${item.image}`);
      console.log(`    URL: http://localhost:5000/uploads/${item.image}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

fixImagePaths();

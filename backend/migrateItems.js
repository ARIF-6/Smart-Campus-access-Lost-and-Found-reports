const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const LostItem = require('./models/LostItem');
const FoundItem = require('./models/FoundItem');
const Item = require('./models/Item');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/final-project');
    console.log('MongoDB Connected');

    // Mongoose models are already loaded via require
    
    // Copy LostItems
    const lostItems = await mongoose.connection.db.collection('lostitems').find({}).toArray();
    console.log(`Found ${lostItems.length} lost items`);
    
    for (let item of lostItems) {
      const exists = await Item.findOne({ _id: item._id });
      if (!exists) {
        await Item.create({
          _id: item._id,
          title: item.title || item.itemName,
          description: item.description,
          category: item.category ? item.category.toLowerCase() : 'others',
          type: 'lost',
          location: item.locationLost || item.location || 'Unknown',
          status: ['pending', 'approved', 'claimed'].includes(item.status) ? item.status : 'pending',
          image: item.image,
          createdBy: item.createdBy,
          createdAt: item.createdAt || new Date()
        });
      }
    }

    // Copy FoundItems
    const foundItems = await mongoose.connection.db.collection('founditems').find({}).toArray();
    console.log(`Found ${foundItems.length} found items`);
    
    for (let item of foundItems) {
      const exists = await Item.findOne({ _id: item._id });
      if (!exists) {
        await Item.create({
          _id: item._id,
          title: item.title || item.itemName,
          description: item.description,
          category: item.category ? item.category.toLowerCase() : 'others',
          type: 'found',
          location: item.locationFound || item.location || 'Unknown',
          status: ['pending', 'approved', 'claimed'].includes(item.status) ? item.status : 'pending',
          image: item.image,
          createdBy: item.createdBy,
          createdAt: item.createdAt || new Date()
        });
      }
    }

    console.log('Migration complete!');
    process.exit(0);
  } catch (error) {
    console.error('Error during migration:', error);
    process.exit(1);
  }
};

connectDB();

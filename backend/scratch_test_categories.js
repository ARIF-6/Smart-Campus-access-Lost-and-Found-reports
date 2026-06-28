require('dotenv').config();
const mongoose = require('mongoose');
const Category = require('./models/Category');

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('DB Connected!');
    const categories = await Category.find({ categoryType: 'class_issue' })
      .collation({ locale: 'en', strength: 2 })
      .sort({ name: 1 })
      .limit(10);
    console.log('Categories queried successfully:', categories.length);
  } catch (err) {
    console.error('Error during Category query:', err);
  } finally {
    await mongoose.disconnect();
  }
};

run();

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const connectDB = require('../config/db');
const { migrateLostFoundImagesToCloudinary } = require('../utils/imageStorageHelper');

const run = async () => {
  try {
    await connectDB();
    const summary = await migrateLostFoundImagesToCloudinary();
    console.log('Migration summary:', summary);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exitCode = 1;
  } finally {
    const mongoose = require('mongoose');
    await mongoose.connection.close();
  }
};

run();

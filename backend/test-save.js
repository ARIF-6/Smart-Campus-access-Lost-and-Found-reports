const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User');

async function test() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost/test');
  try {
    const user = await User.findById('69ac89fa6031fcd130e6da5e');
    if (!user) {
       console.log("User not found!");
       process.exit(0);
    }
    console.log("User retrieved:", user.toJSON());
    user.isDeleted = false; // Just mutate something
    await user.save();
    console.log("Saved successfully!");
  } catch(e) {
    console.error("CRASH:", e);
  }
  process.exit();
}
test();

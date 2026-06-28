const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');

dotenv.config();

const normalizeEmails = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB Connected to normalize emails...');

    const users = await User.find({});
    console.log(`Found ${users.length} users. List of emails:`);
    users.forEach(u => console.log(`- ${u.email} (${u.role})`));

    console.log(`Checking for emails to normalize...`);

    let updatedCount = 0;
    for (const user of users) {
      if (user.email !== user.email.toLowerCase()) {
        const oldEmail = user.email;
        user.email = user.email.toLowerCase();
        await user.save();
        console.log(`Normalized: ${oldEmail} -> ${user.email}`);
        updatedCount++;
      }
    }

    console.log(`Normalization complete. ${updatedCount} users updated.`);
    process.exit(0);
  } catch (error) {
    console.error(`Error during normalization: ${error.message}`);
    process.exit(1);
  }
};

normalizeEmails();

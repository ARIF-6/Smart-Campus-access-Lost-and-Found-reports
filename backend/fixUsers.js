const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const connectDB = require('./config/db');

dotenv.config();

const seedEmails = [
  'caarif@gmail.com'
];

const fixUsers = async () => {
  try {
    await connectDB();

    // Fix existing users: ensure they are active and not deleted
    const result = await User.updateMany(
      { email: { $in: seedEmails } },
      { $set: { isActive: true, isDeleted: false } }
    );
    console.log(`Updated ${result.modifiedCount} user(s) to isActive=true, isDeleted=false`);

    // Create any missing users
    const usersToSeed = [
      {
        fullName: 'Mohamed Dhuh Arif',
        email: 'caarif@gmail.com',
        password: 'caarif123',
        plainPassword: 'caarif123',
        role: 'admin',
        isActive: true,
        isDeleted: false
      }
    ];

    for (const u of usersToSeed) {
      const exists = await User.findOne({ email: u.email });
      if (!exists) {
        await User.create(u);
        console.log(`Created missing user: ${u.email}`);
      } else {
        let modified = false;
        if (exists.fullName !== u.fullName) {
          exists.fullName = u.fullName;
          modified = true;
        }
        if (!exists.plainPassword && u.plainPassword) {
          exists.plainPassword = u.plainPassword;
          modified = true;
        }
        if (modified) {
          await exists.save();
          console.log(`Updated user: ${u.email}`);
        }
      }
    }

    // Verify
    const users = await User.find({ email: { $in: seedEmails } }).select('email isActive isDeleted role');
    console.log('\nCurrent status:');
    users.forEach(u => {
      console.log(`  ${u.email} | role=${u.role} | isActive=${u.isActive} | isDeleted=${u.isDeleted}`);
    });

    console.log('\nDone! Try logging in now.');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
};

fixUsers();

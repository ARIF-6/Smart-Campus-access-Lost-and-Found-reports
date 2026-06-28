const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const Role = require('./models/Role');
const connectDB = require('./config/db');

dotenv.config();

// const users = [
//   {
//     fullName: 'Mohamed Dhuh Arif',
//     username: 'Caarif',
//     password: 'caarif',
//     plainPassword: 'caarif',
//     role: 'admin'
//   },

// ];


const seedUsers = async () => {
  try {
    await connectDB();

    for (const u of users) {
      const query = u.email ? { email: u.email } : { username: u.username };
      const userExists = await User.findOne(query);
      const identifier = u.email || u.username;
      if (!userExists) {
        await User.create(u);
        console.log(`User created: ${identifier} (${u.role})`);
      } else {
        let modified = false;
        if (userExists.fullName !== u.fullName) {
          userExists.fullName = u.fullName;
          modified = true;
        }
        if (u.username && userExists.username !== u.username) {
          userExists.username = u.username;
          modified = true;
        }
        if (u.password && userExists.password !== u.password) {
          userExists.password = u.password; // pre-save hook hashes it
          userExists.plainPassword = u.plainPassword;
          modified = true;
        }
        if (modified) {
          await userExists.save();
          console.log(`Updated user: ${identifier}`);
        } else {
          console.log(`User already exists: ${identifier}`);
        }
      }
    }

    console.log('User seeding completed.');
    process.exit();
  } catch (err) {
    console.error('Error seeding users:', err);
    process.exit(1);
  }
};

seedUsers();

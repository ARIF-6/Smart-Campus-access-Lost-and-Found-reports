const mongoose = require('mongoose');
require('dotenv').config();
const CampusEnvironmentIssue = require('./modules/campusEnvironment/models/CampusEnvironmentIssue');

const seedIssues = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const issues = [
      { issueName: 'Water Issue', category: 'Plumbing' },
      { issueName: 'Toilet Problem', category: 'Sanitation' },
      { issueName: 'Parking Issue', category: 'Infrastructure' },
      { issueName: 'Cleaning Issue', category: 'Maintenance' },
      { issueName: 'Electricity Problem', category: 'Electrical' },
      { issueName: 'Wi-Fi Problem', category: 'IT' }
    ];

    for (const issue of issues) {
      await CampusEnvironmentIssue.findOneAndUpdate(
        { issueName: issue.issueName },
        issue,
        { upsert: true, new: true }
      );
    }

    console.log('Seed data inserted successfully');
    process.exit();
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
};

seedIssues();

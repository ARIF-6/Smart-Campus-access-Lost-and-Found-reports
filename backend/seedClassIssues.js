const mongoose = require('mongoose');
const { ClassIssueType } = require('./modules/classIssues/models/classIssueModels');
require('dotenv').config();

const issueTypes = [
  { issueName: 'Projector Problem', category: 'Multimedia' },
  { issueName: 'Fan Not Working', category: 'Electrical' },
  { issueName: 'Whiteboard Issue', category: 'Infrastructure' },
  { issueName: 'Lecturer Attendance Issue', category: 'Academic' },
  { issueName: 'Classroom Noise', category: 'Environment' },
  { issueName: 'Air Conditioning Problem', category: 'Electrical' },
  { issueName: 'Classroom Capacity Problem', category: 'Academic' },
  { issueName: 'Broken Chair/Table', category: 'Furniture' }
];

const seedIssueTypes = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB for seeding...');

    for (const type of issueTypes) {
      await ClassIssueType.findOneAndUpdate(
        { issueName: type.issueName },
        type,
        { upsert: true, new: true }
      );
    }

    console.log('Class Issue Types seeded successfully!');
    process.exit();
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
};

seedIssueTypes();

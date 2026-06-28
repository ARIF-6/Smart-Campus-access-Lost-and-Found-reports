const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User');
const Shift = require('./models/Shift');

const checkShifts = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/graduation_project');
        console.log('Connected to DB');
        
        const shifts = await Shift.find({}).lean();
        console.log(`Found ${shifts.length} shifts:`);
        
        for (const s of shifts) {
            const user = await User.findById(s.guardId);
            console.log(`Shift ID: ${s._id}, guardId: ${s.guardId}, User exists? ${!!user}, User fullName: ${user?.fullName}, role: ${user?.role}`);
        }
        
    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

checkShifts();

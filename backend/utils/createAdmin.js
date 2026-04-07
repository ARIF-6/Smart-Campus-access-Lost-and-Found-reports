const User = require('../models/User');

const createAdmin = async () => {
    try {
        const adminEmail = 'admin@smartcampus.com';
        const adminExists = await User.findOne({ email: adminEmail });
        
        if (!adminExists) {
            // Note: Password hashing will be handled automatically by the pre-save hook in the User model
            const admin = await User.create({
                name: 'System Admin',
                email: adminEmail,
                password: 'admin123',
                role: 'admin'
            });
            console.log('Default admin account created successfully.');
        } else {
            console.log('Admin account already exists.');
        }
    } catch (error) {
        console.error('Error creating default admin:', error);
    }
};

module.exports = createAdmin;

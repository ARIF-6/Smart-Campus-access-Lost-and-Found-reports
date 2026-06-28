const User = require('../models/User');
const Role = require('../models/Role');

const createAdmin = async () => {
    try {
        // Clean up any empty string fields that should be null in the DB
        await User.collection.updateMany({ faculty: "" }, { $set: { faculty: null } });
        await User.collection.updateMany({ department: "" }, { $set: { department: null } });
        await User.collection.updateMany({ class: "" }, { $set: { class: null } });
        await User.collection.updateMany({ campus: "" }, { $set: { campus: null } });

        // Initialize default roles
        const defaultRoles = [
            { name: 'admin', displayName: 'Administrator', color: 'bg-red-100 text-red-800', description: 'Full system access' },
            { name: 'staff', displayName: 'Staff', color: 'bg-purple-100 text-purple-800', description: 'Management access' },
            { name: 'security', displayName: 'Security', color: 'bg-blue-100 text-blue-800', description: 'QR scanning and reports' },
            { name: 'student', displayName: 'Student', color: 'bg-gray-100 text-gray-800', description: 'Standard user access' },
            { name: 'clean', displayName: 'Cleaner', color: 'bg-green-100 text-green-800', description: 'Restricted access' }
        ];

        // Clean up any extra roles in DB
        const roleNames = defaultRoles.map(r => r.name);
        await Role.deleteMany({ name: { $nin: roleNames } });

        for (const roleData of defaultRoles) {
            const roleExists = await Role.findOne({ name: roleData.name });
            if (!roleExists) {
                await Role.create(roleData);
                console.log(`Role ${roleData.name} created.`);
            }
        }

        // Migrate all existing superadmin users to admin
        await User.updateMany({ role: 'superadmin' }, { role: 'admin' });

        const adminUsername = 'Caarif';
        const existingAdmin = await User.findOne({ username: adminUsername });

        if (existingAdmin) {
            existingAdmin.fullName = 'System Administrator';
            existingAdmin.username = adminUsername;
            existingAdmin.password = '123456';
            existingAdmin.plainPassword = '123456';
            existingAdmin.role = 'admin';
            existingAdmin.isActive = true;
            existingAdmin.isDeleted = false;
            // Remove email property using Mongoose's undefined
            existingAdmin.email = undefined;
            await existingAdmin.save();
            console.log('Admin account Caarif updated successfully with password 123456.');
        } else {
            await User.create({
                fullName: 'System Administrator',
                username: adminUsername,
                password: '123456',
                plainPassword: '123456',
                role: 'admin',
                isActive: true,
                isDeleted: false
            });
            console.log('Admin account Caarif created successfully.');
        }

        // Clean up any remaining email-based admin users
        await User.deleteMany({ email: { $exists: true } });
    } catch (error) {
        console.error('Error in initialization script:', error);
    }
};

module.exports = createAdmin;


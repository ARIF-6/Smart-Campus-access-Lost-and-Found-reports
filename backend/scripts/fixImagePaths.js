const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../.env') });

const User = require('../models/User');
const LostItem = require('../models/LostItem');
const FoundItem = require('../models/FoundItem');
const Item = require('../models/Item');
const Incident = require('../models/Incident');

const normalizeImagePath = (fullPath) => {
  if (!fullPath) return fullPath;
  
  // If already relative (no drive letter), return as-is
  if (!fullPath.match(/^[A-Za-z]:/)) {
    return fullPath;
  }

  // Convert absolute Windows path to relative
  // e.g., "C:\Users\...\backend\uploads\profiles\..." → "profiles/..."
  let normalized = fullPath.replace(/\\/g, '/'); // Convert backslashes to forward slashes
  normalized = normalized.replaceFirst(/^[A-Za-z]:\//, ''); // Remove drive letter
  
  // Extract everything after 'uploads/'
  const uploadsIndex = normalized.indexOf('uploads/');
  if (uploadsIndex !== -1) {
    normalized = normalized.substring(uploadsIndex + 'uploads/'.length);
    // Re-add the uploads prefix to get relative path from project root
    normalized = `uploads/${normalized}`;
  }
  
  return normalized;
};

// Node.js version of replaceFirst
String.prototype.replaceFirst = function(search, replace) {
  const index = this.indexOf(search);
  if (index === -1) return this;
  return this.substring(0, index) + replace + this.substring(index + search.length);
};

const fixImagePaths = async () => {
  try {
    console.log('🔧 Starting image path migration...\n');
    
    // Connect to MongoDB
    const mongoUrl = process.env.MONGO_URI || 'mongodb://localhost:27017/campus-access';
    await mongoose.connect(mongoUrl);
    console.log('✅ Connected to MongoDB\n');

    let totalFixed = 0;

    // ─────────────────── FIX USERS (photoUrl) ────────────────────
    console.log('📝 Checking User photoUrl fields...');
    const users = await User.find({ photoUrl: { $exists: true, $ne: null, $ne: '' } });
    let usersFixed = 0;
    
    for (const user of users) {
      const oldPath = user.photoUrl;
      const newPath = normalizeImagePath(oldPath);
      
      if (oldPath !== newPath) {
        user.photoUrl = newPath;
        await user.save();
        usersFixed++;
        console.log(`  ✓ User ${user.email}: "${oldPath}" → "${newPath}"`);
      }
    }
    console.log(`  → Fixed ${usersFixed}/${users.length} user photos\n`);
    totalFixed += usersFixed;

    // ─────────────────── FIX LOST ITEMS (image) ────────────────────
    console.log('📝 Checking LostItem image fields...');
    const lostItems = await LostItem.find({ image: { $exists: true, $ne: null, $ne: '' } });
    let lostItemsFixed = 0;
    
    for (const item of lostItems) {
      const oldPath = item.image;
      const newPath = normalizeImagePath(oldPath);
      
      if (oldPath !== newPath) {
        item.image = newPath;
        await item.save();
        lostItemsFixed++;
        console.log(`  ✓ Lost Item ${item._id}: "${oldPath}" → "${newPath}"`);
      }
    }
    console.log(`  → Fixed ${lostItemsFixed}/${lostItems.length} lost item images\n`);
    totalFixed += lostItemsFixed;

    // ─────────────────── FIX FOUND ITEMS (image) ────────────────────
    console.log('📝 Checking FoundItem image fields...');
    const foundItems = await FoundItem.find({ image: { $exists: true, $ne: null, $ne: '' } });
    let foundItemsFixed = 0;
    
    for (const item of foundItems) {
      const oldPath = item.image;
      const newPath = normalizeImagePath(oldPath);
      
      if (oldPath !== newPath) {
        item.image = newPath;
        await item.save();
        foundItemsFixed++;
        console.log(`  ✓ Found Item ${item._id}: "${oldPath}" → "${newPath}"`);
      }
    }
    console.log(`  → Fixed ${foundItemsFixed}/${foundItems.length} found item images\n`);
    totalFixed += foundItemsFixed;

    // ─────────────────── FIX ITEMS (image) ────────────────────
    console.log('📝 Checking Item image fields...');
    const items = await Item.find({ image: { $exists: true, $ne: null, $ne: '' } });
    let itemsFixed = 0;
    
    for (const item of items) {
      const oldPath = item.image;
      const newPath = normalizeImagePath(oldPath);
      
      if (oldPath !== newPath) {
        item.image = newPath;
        await item.save();
        itemsFixed++;
        console.log(`  ✓ Item ${item._id}: "${oldPath}" → "${newPath}"`);
      }
    }
    console.log(`  → Fixed ${itemsFixed}/${items.length} item images\n`);
    totalFixed += itemsFixed;

    // ─────────────────── FIX INCIDENTS (evidenceImage) ────────────────────
    console.log('📝 Checking Incident evidenceImage fields...');
    const incidents = await Incident.find({ evidenceImage: { $exists: true, $ne: null, $ne: '' } });
    let incidentsFixed = 0;
    
    for (const incident of incidents) {
      const oldPath = incident.evidenceImage;
      const newPath = normalizeImagePath(oldPath);
      
      if (oldPath !== newPath) {
        incident.evidenceImage = newPath;
        await incident.save();
        incidentsFixed++;
        console.log(`  ✓ Incident ${incident._id}: "${oldPath}" → "${newPath}"`);
      }
    }
    console.log(`  → Fixed ${incidentsFixed}/${incidents.length} incident images\n`);
    totalFixed += incidentsFixed;

    console.log('═══════════════════════════════════════════');
    console.log(`✅ Migration complete! Total fixed: ${totalFixed} records`);
    console.log('═══════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Error during migration:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('Disconnected from MongoDB');
  }
};

fixImagePaths();

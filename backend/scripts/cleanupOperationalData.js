/**
 * ============================================================
 *   CAMPUS ACCESS — Production Data Cleanup Script
 * ============================================================
 *
 * WHAT IT DOES:
 *   Deletes all operational/transactional data from the database
 *   while preserving system configuration and the administrator account.
 *
 * WHAT IS PRESERVED:
 *   - Administrator account(s)
 *   - Roles & permissions
 *   - Campus configuration
 *   - Categories (Lost & Found)
 *   - Faculties, Departments, Classes, Halls, Shifts
 *   - Campus Environment Issue Types
 *   - Class Issue Types
 *   - All indexes, schema, and database structure
 *
 * WHAT IS DELETED:
 *   - All non-admin Users (students, security, cleaners, staff, etc.)
 *   - Access Logs
 *   - Audit Logs
 *   - Lost Items
 *   - Found Items
 *   - Claims
 *   - Claim Requests
 *   - Ownership Reports
 *   - Ownership Disputes
 *   - Ownership History
 *   - Matches
 *   - Visitors & Hosts
 *   - Incidents
 *   - Blacklists
 *   - Campus Attendance
 *   - Daily No-Exit Reports
 *   - Announcements
 *   - Notifications
 *   - Campus Environment Complaints, Tracking, Support
 *   - Class Issue Complaints & Tracking
 *
 * USAGE:
 *   node scripts/cleanupOperationalData.js
 *
 * ============================================================
 */

'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const mongoose = require('mongoose');

// ── Core models ──────────────────────────────────────────────
const User                        = require('../models/User');
const AccessLog                   = require('../models/AccessLog');
const AuditLog                    = require('../models/AuditLog');
const Blacklist                   = require('../models/Blacklist');
const LostItem                    = require('../models/LostItem');
const FoundItem                   = require('../models/FoundItem');
const Item                        = require('../models/Item');
const Claim                       = require('../models/Claim');
const ClaimRequest                = require('../models/ClaimRequest');
const OwnershipReport             = require('../models/OwnershipReport');
const OwnershipDispute            = require('../models/OwnershipDispute');
const OwnershipHistory            = require('../models/OwnershipHistory');
const Match                       = require('../models/Match');
const Visitor                     = require('../models/Visitor');
const Host                        = require('../models/Host');
const Incident                    = require('../models/Incident');
const CampusAttendance            = require('../models/CampusAttendance');
const DailyNoExitReport           = require('../models/DailyNoExitReport');
const Announcement                = require('../models/Announcement');
const Notification                = require('../models/Notification');

// ── Module models ─────────────────────────────────────────────
const CampusEnvironmentComplaint  = require('../modules/campusEnvironment/models/CampusEnvironmentComplaint');
const CampusEnvironmentTracking   = require('../modules/campusEnvironment/models/CampusEnvironmentTracking');
const CampusEnvironmentSupport    = require('../modules/campusEnvironment/models/CampusEnvironmentSupport');

const {
  ClassIssueComplaint,
  ClassIssueTracking,
}                                  = require('../modules/classIssues/models/classIssueModels');

// ── Helpers ───────────────────────────────────────────────────
const log  = (msg) => console.log(`  [INFO]  ${msg}`);
const ok   = (msg) => console.log(`  [OK]    ${msg}`);
const warn = (msg) => console.log(`  [WARN]  ${msg}`);
const err  = (msg) => console.error(`  [ERROR] ${msg}`);

async function deleteCollection(Model, label, filter = {}) {
  try {
    const result = await Model.deleteMany(filter);
    ok(`${label}: deleted ${result.deletedCount} record(s)`);
  } catch (e) {
    err(`${label}: ${e.message}`);
  }
}

async function main() {
  const dbUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!dbUri) {
    err('MONGO_URI / MONGODB_URI environment variable is not set. Aborting.');
    process.exit(1);
  }

  console.log('\n============================================================');
  console.log('  CAMPUS ACCESS — Production Data Cleanup');
  console.log('============================================================\n');

  log('Connecting to MongoDB…');
  await mongoose.connect(dbUri, {
    maxPoolSize: 5,
    serverSelectionTimeoutMS: 10000,
  });
  ok('Connected.\n');

  // ── Confirm admin account exists before starting ──────────────
  const adminCount = await User.countDocuments({ role: 'admin' });
  if (adminCount === 0) {
    err('No administrator account found! Cleanup aborted to prevent losing all access.');
    await mongoose.connection.close();
    process.exit(1);
  }
  ok(`Found ${adminCount} administrator account(s). These will be preserved.\n`);

  log('Starting cleanup of operational data…\n');

  // ─────────────────────────────────────────────────────────────
  //  USERS  — delete everyone except admins
  // ─────────────────────────────────────────────────────────────
  await deleteCollection(User, 'Users (non-admin)', { role: { $ne: 'admin' } });

  // ─────────────────────────────────────────────────────────────
  //  ACCESS & AUDIT LOGS
  // ─────────────────────────────────────────────────────────────
  await deleteCollection(AccessLog,   'Access Logs');
  await deleteCollection(AuditLog,    'Audit Logs');

  // ─────────────────────────────────────────────────────────────
  //  LOST & FOUND
  // ─────────────────────────────────────────────────────────────
  await deleteCollection(LostItem,         'Lost Items');
  await deleteCollection(FoundItem,        'Found Items');
  await deleteCollection(Item,             'Items (general)');
  await deleteCollection(Claim,            'Claims');
  await deleteCollection(ClaimRequest,     'Claim Requests');
  await deleteCollection(OwnershipReport,  'Ownership Reports');
  await deleteCollection(OwnershipDispute, 'Ownership Disputes');
  await deleteCollection(OwnershipHistory, 'Ownership History');
  await deleteCollection(Match,            'Item Matches');

  // ─────────────────────────────────────────────────────────────
  //  SECURITY / VISITORS
  // ─────────────────────────────────────────────────────────────
  await deleteCollection(Visitor,   'Visitors');
  await deleteCollection(Host,      'Hosts');
  await deleteCollection(Incident,  'Incidents');
  await deleteCollection(Blacklist, 'Blacklists');

  // ─────────────────────────────────────────────────────────────
  //  ATTENDANCE
  // ─────────────────────────────────────────────────────────────
  await deleteCollection(CampusAttendance,   'Campus Attendance');
  await deleteCollection(DailyNoExitReport,  'Daily No-Exit Reports');

  // ─────────────────────────────────────────────────────────────
  //  NOTIFICATIONS & ANNOUNCEMENTS
  // ─────────────────────────────────────────────────────────────
  await deleteCollection(Notification,  'Notifications');
  await deleteCollection(Announcement,  'Announcements');

  // ─────────────────────────────────────────────────────────────
  //  CAMPUS ENVIRONMENT (module)
  // ─────────────────────────────────────────────────────────────
  await deleteCollection(CampusEnvironmentComplaint, 'Campus Environment Complaints');
  await deleteCollection(CampusEnvironmentTracking,  'Campus Environment Tracking');
  await deleteCollection(CampusEnvironmentSupport,   'Campus Environment Support');

  // ─────────────────────────────────────────────────────────────
  //  CLASS ISSUES (module)
  // ─────────────────────────────────────────────────────────────
  await deleteCollection(ClassIssueComplaint, 'Class Issue Complaints');
  await deleteCollection(ClassIssueTracking,  'Class Issue Tracking');

  // ─────────────────────────────────────────────────────────────
  //  DONE
  // ─────────────────────────────────────────────────────────────
  console.log('\n============================================================');
  console.log('  Cleanup complete! System is ready for fresh production data.');
  console.log('');
  console.log('  Preserved:');
  console.log('    ✔ Administrator account(s)');
  console.log('    ✔ Roles & Permissions');
  console.log('    ✔ Campus configuration');
  console.log('    ✔ Categories (Lost & Found)');
  console.log('    ✔ Faculties, Departments, Classes, Halls, Shifts');
  console.log('    ✔ Campus Environment Issue Types');
  console.log('    ✔ Class Issue Types');
  console.log('    ✔ Database schema & indexes');
  console.log('============================================================\n');

  await mongoose.connection.close();
  process.exit(0);
}

main().catch((e) => {
  err(`Unexpected error: ${e.message}`);
  console.error(e);
  mongoose.connection.close();
  process.exit(1);
});

const DailyNoExitReport = require('../models/DailyNoExitReport');
const AccessLog = require('../models/AccessLog');
const User = require('../models/User');

const checkAndGenerateDailyNoExitReports = async () => {
  try {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Find the oldest unclosed log from a previous day
    const oldestUnclosedLog = await AccessLog.findOne({
      status: 'IN',
      entryTime: { $lt: startOfToday }
    }).sort({ entryTime: 1 });

    if (!oldestUnclosedLog) {
      return; // Nothing to process
    }

    // We have unclosed logs from past days. Let's process day-by-day.
    let currentDayStart = new Date(oldestUnclosedLog.entryTime.getFullYear(), oldestUnclosedLog.entryTime.getMonth(), oldestUnclosedLog.entryTime.getDate());

    while (currentDayStart < startOfToday) {
      const currentDayEnd = new Date(currentDayStart.getTime() + 24 * 60 * 60 * 1000);

      // Find all unclosed logs on this specific day
      const unclosedLogs = await AccessLog.find({
        status: 'IN',
        entryTime: { $gte: currentDayStart, $lt: currentDayEnd }
      }).populate('userId');

      if (unclosedLogs.length > 0) {
        const studentsList = [];
        for (const log of unclosedLogs) {
          if (log.userId) {
            studentsList.push({
              userId: log.userId._id,
              fullName: log.userId.fullName || log.userId.name || 'Unknown',
              studentId: log.userId.studentId || '',
              entryTime: log.entryTime
            });
          }
        }

        // Create report if there are students who didn't exit
        if (studentsList.length > 0) {
          // Use upsert to prevent duplicate keys on concurrent calls
          await DailyNoExitReport.findOneAndUpdate(
            { date: currentDayStart },
            {
              $setOnInsert: { date: currentDayStart },
              $set: {
                students: studentsList,
                totalNoExit: studentsList.length
              }
            },
            { upsert: true, new: true }
          );
        }

        // Close the logs by marking them as OUT at the end of that day (23:59:59)
        const closeTime = new Date(currentDayEnd.getTime() - 1000); // 23:59:59
        await AccessLog.updateMany(
          {
            status: 'IN',
            entryTime: { $gte: currentDayStart, $lt: currentDayEnd }
          },
          {
            $set: {
              status: 'OUT',
              exitTime: closeTime
            }
          }
        );
      }

      // Move to next day
      currentDayStart = currentDayEnd;
    }
  } catch (err) {
    console.error('Error generating daily no exit reports:', err);
  }
};

module.exports = {
  checkAndGenerateDailyNoExitReports
};

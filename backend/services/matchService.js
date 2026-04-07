const LostItem = require('../models/LostItem');
const FoundItem = require('../models/FoundItem');
const Match = require('../models/Match');
const Notification = require('../models/Notification');

/**
 * Calculates a similarity score between a lost item and a found item.
 */
const calculateScore = (lost, found) => {
  let score = 0;

  // 1. Category Match (Must Match) - +20 points
  if (lost.category.toLowerCase() === found.category.toLowerCase()) {
    score += 20;
  } else {
    return 0; // If categories don't match, we don't consider it a match
  }

  // 2. Title Similarity - +40 points
  const lostTitleWords = lost.title.toLowerCase().split(/\s+/);
  const foundTitleWords = found.title.toLowerCase().split(/\s+/);
  const commonTitleWords = lostTitleWords.filter(word => foundTitleWords.includes(word));
  
  if (commonTitleWords.length > 0) {
    const similarity = commonTitleWords.length / Math.max(lostTitleWords.length, foundTitleWords.length);
    score += Math.round(similarity * 40);
  }

  // 3. Location Match - +20 points
  const lostLoc = lost.locationLost.toLowerCase();
  const foundLoc = found.locationFound.toLowerCase();
  if (lostLoc === foundLoc) {
    score += 20;
  } else if (lostLoc.includes(foundLoc) || foundLoc.includes(lostLoc)) {
    score += 10;
  }

  // 4. Date Proximity (within 7 days) - +10 points
  const lostDate = new Date(lost.dateLost);
  const foundDate = new Date(found.dateFound);
  const diffTime = Math.abs(foundDate - lostDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays <= 7) {
    score += 10;
  } else if (diffDays <= 14) {
    score += 5;
  }

  // 5. Description Similarity - +10 points
  const lostDescWords = lost.description.toLowerCase().split(/\s+/);
  const foundDescWords = found.description.toLowerCase().split(/\s+/);
  const commonDescWords = lostDescWords.filter(word => foundDescWords.includes(word));
  
  if (commonDescWords.length > 0) {
    const similarity = commonDescWords.length / Math.max(lostDescWords.length, foundDescWords.length);
    score += Math.round(similarity * 10);
  }

  return Math.min(score, 100);
};

/**
 * Finds matches for a single lost item against all found items.
 */
const findMatchesForLostItem = async (lostItemId) => {
  const lostItem = await LostItem.findById(lostItemId);
  if (!lostItem || lostItem.status === 'returned') return;

  // Only check found items from the last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const foundItems = await FoundItem.find({
    status: 'found',
    createdAt: { $gte: thirtyDaysAgo }
  });

  for (const foundItem of foundItems) {
    const score = calculateScore(lostItem, foundItem);
    if (score >= 60) {
      const existingMatch = await Match.findOne({ lostItemId: lostItem._id, foundItemId: foundItem._id });
      if (!existingMatch) {
        await Match.create({ lostItemId: lostItem._id, foundItemId: foundItem._id, matchScore: score });
        // Create notification for lost item owner
        if (lostItem.reportedBy) {
          const notif = await Notification.create({
            userId: lostItem.reportedBy,
            title: 'Match Found',
            message: `A possible match was found for your lost item: ${lostItem.title}`,
            type: 'MATCH',
            relatedItemId: lostItem._id
          });
          const io = require('../utils/socket').getIO();
          if(io) io.to(lostItem.reportedBy.toString()).emit('notification', notif);
        }
      } else if (existingMatch.matchScore !== score) {
        existingMatch.matchScore = score;
        await existingMatch.save();
      }
    }
  }
};

/**
 * Finds matches for a single found item against all lost items.
 */
const findMatchesForFoundItem = async (foundItemId) => {
  const foundItem = await FoundItem.findById(foundItemId);
  if (!foundItem || foundItem.status === 'returned') return;

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const lostItems = await LostItem.find({
    status: 'lost',
    createdAt: { $gte: thirtyDaysAgo }
  });

  for (const lostItem of lostItems) {
    const score = calculateScore(lostItem, foundItem);
    if (score >= 60) {
      const existingMatch = await Match.findOne({ lostItemId: lostItem._id, foundItemId: foundItem._id });
      if (!existingMatch) {
        await Match.create({ lostItemId: lostItem._id, foundItemId: foundItem._id, matchScore: score });
        // Create notification for lost item owner
        if (lostItem.reportedBy) {
          const notif = await Notification.create({
            userId: lostItem.reportedBy,
            title: 'Match Found',
            message: `A possible match was found for your lost item: ${lostItem.title}`,
            type: 'MATCH',
            relatedItemId: lostItem._id
          });
          const io = require('../utils/socket').getIO();
          if(io) io.to(lostItem.reportedBy.toString()).emit('notification', notif);
        }
      } else if (existingMatch.matchScore !== score) {
        existingMatch.matchScore = score;
        await existingMatch.save();
      }
    }
  }
};

/**
 * Scans the entire database and recalculates all matches.
 */
const recalculateAllMatches = async () => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const lostItems = await LostItem.find({ status: 'lost', createdAt: { $gte: thirtyDaysAgo } });
  const foundItems = await FoundItem.find({ status: 'found', createdAt: { $gte: thirtyDaysAgo } });

  // Clear old suggested matches (optional, depending on preference)
  // await Match.deleteMany({ status: 'Suggested' });

  for (const lost of lostItems) {
    for (const found of foundItems) {
      const score = calculateScore(lost, found);
      if (score >= 60) {
        const existingMatch = await Match.findOne({ lostItemId: lost._id, foundItemId: found._id });
        if (!existingMatch) {
          await Match.create({ lostItemId: lost._id, foundItemId: found._id, matchScore: score });
          // Create notification for lost item owner
          if (lost.reportedBy) {
            const notif = await Notification.create({
              userId: lost.reportedBy,
              title: 'Match Found',
              message: `A possible match was found for your lost item: ${lost.title}`,
              type: 'MATCH',
              relatedItemId: lost._id
            });
            const io = require('../utils/socket').getIO();
            if(io) io.to(lost.reportedBy.toString()).emit('notification', notif);
          }
        } else if (existingMatch.matchScore !== score) {
          existingMatch.matchScore = score;
          await existingMatch.save();
        }
      }
    }
  }
};

module.exports = {
  findMatchesForLostItem,
  findMatchesForFoundItem,
  recalculateAllMatches
};

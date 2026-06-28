const LostItem = require('../models/LostItem');
const FoundItem = require('../models/FoundItem');
const Claim = require('../models/Claim');
const Notification = require('../models/Notification'); // Used for recent activity proxy

// Helper for recent dates
const getPastDate = (days) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d;
};

// @desc    Get top KPIs
// @route   GET /api/dashboard/stats
exports.getStats = async (req, res) => {
  try {
    const totalLost = await LostItem.countDocuments();
    const totalFound = await FoundItem.countDocuments();
    const totalClaims = await Claim.countDocuments();
    const pendingClaims = await Claim.countDocuments({ status: 'pending' });

    res.json({ totalLost, totalFound, totalClaims, pendingClaims });
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get Lost vs Found per month (last 6 months approximation)
// @route   GET /api/dashboard/lost-vs-found
exports.getLostVsFound = async (req, res) => {
  try {
    const data = [];
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    for (let i = 5; i >= 0; i--) {
      const start = new Date();
      start.setMonth(start.getMonth() - i);
      start.setDate(1);
      start.setHours(0,0,0,0);

      const end = new Date(start);
      end.setMonth(end.getMonth() + 1);

      const lostCount = await LostItem.countDocuments({ createdAt: { $gte: start, $lt: end } });
      const foundCount = await FoundItem.countDocuments({ createdAt: { $gte: start, $lt: end } });

      data.push({
        month: monthNames[start.getMonth()],
        lost: lostCount,
        found: foundCount
      });
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get items by category
// @route   GET /api/dashboard/categories
exports.getCategories = async (req, res) => {
  try {
    const categoriesMap = {};
    
    // Aggregate lost items
    const lostAggr = await LostItem.aggregate([
      { $group: { _id: "$category", count: { $sum: 1 } } }
    ]);
    
    // Aggregate found items
    const foundAggr = await FoundItem.aggregate([
      { $group: { _id: "$category", count: { $sum: 1 } } }
    ]);

    lostAggr.forEach(item => {
      categoriesMap[item._id] = (categoriesMap[item._id] || 0) + item.count;
    });

    foundAggr.forEach(item => {
      categoriesMap[item._id] = (categoriesMap[item._id] || 0) + item.count;
    });

    const categoriesList = Object.keys(categoriesMap).map(key => ({
      name: key,
      value: categoriesMap[key]
    })).sort((a,b) => b.value - a.value);

    // Limit to top 5 and group rest as 'Others'
    if (categoriesList.length > 5) {
      const top4 = categoriesList.slice(0, 4);
      const othersVal = categoriesList.slice(4).reduce((acc, curr) => acc + curr.value, 0);
      top4.push({ name: 'Others', value: othersVal });
      return res.json(top4);
    }

    res.json(categoriesList);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get activity over last 7 days (Count of new lost + found reports)
// @route   GET /api/dashboard/activity
exports.getActivityLine = async (req, res) => {
  try {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const data = [];

    for (let i = 6; i >= 0; i--) {
      const start = new Date();
      start.setDate(start.getDate() - i);
      start.setHours(0,0,0,0);

      const end = new Date(start);
      end.setDate(end.getDate() + 1);

      const lostCount = await LostItem.countDocuments({ createdAt: { $gte: start, $lt: end } });
      const foundCount = await FoundItem.countDocuments({ createdAt: { $gte: start, $lt: end } });

      data.push({
        day: days[start.getDay()],
        count: lostCount + foundCount
      });
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get recent system activity
// @route   GET /api/dashboard/recent-activity
exports.getRecentActivity = async (req, res) => {
  try {
    // Fetch latest notifications across all users as a proxy for "Activity"
    const recentNots = await Notification.find().sort({ createdAt: -1 }).limit(10).populate('userId', 'name');
    
    // Also fetch latest items directly to supplement
    const latestLost = await LostItem.find().sort({ createdAt: -1 }).limit(5).populate('createdBy', 'name fullName');
    const latestFound = await FoundItem.find().sort({ createdAt: -1 }).limit(5).populate('createdBy', 'name fullName');
    const latestClaims = await Claim.find().sort({ createdAt: -1 }).limit(5).populate('user', 'name fullName');

    const activityPool = [];

    // Map lost items
    latestLost.forEach(i => {
      activityPool.push({
        type: 'lost',
        message: `${i.createdBy?.fullName || i.createdBy?.name || 'A user'} reported a lost item: ${i.title}`,
        createdAt: i.createdAt
      });
    });

    // Map found items
    latestFound.forEach(i => {
      activityPool.push({
        type: 'found',
        message: `${i.createdBy?.fullName || i.createdBy?.name || 'A user'} reported a found item: ${i.title}`,
        createdAt: i.createdAt
      });
    });

    // Map claims
    latestClaims.forEach(i => {
      activityPool.push({
        type: 'claim',
        message: `${i.user?.fullName || i.user?.name || 'A user'} submitted a claim request`,
        createdAt: i.createdAt
      });
    });

    // Sort combined pool and get top 10
    activityPool.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    const formattedActivity = activityPool.slice(0, 10).map(item => {
      const now = new Date();
      const diff = Math.floor((now - new Date(item.createdAt)) / 1000);
      let timeAgo = '';
      if (diff < 60) timeAgo = `${diff} seconds ago`;
      else if (diff < 3600) timeAgo = `${Math.floor(diff / 60)} minutes ago`;
      else if (diff < 86400) timeAgo = `${Math.floor(diff / 3600)} hours ago`;
      else timeAgo = `${Math.floor(diff / 86400)} days ago`;

      return {
        message: item.message,
        date: timeAgo,
        type: item.type
      };
    });

    res.json(formattedActivity);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};
exports.getSystemStatus = async (req, res) => {
  try {
    // Simple health check; could be expanded with DB checks, etc.
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

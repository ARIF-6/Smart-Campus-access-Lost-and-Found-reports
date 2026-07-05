const { getIO } = require('../index');

/**
 * Emit a real-time notification to a specific user or role
 * @param {Object} notification - The notification object from DB
 */
const emitNotification = (notification) => {
  try {
    const io = getIO();
    
    const eventData = {
      id: notification._id,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      module: notification.module,
      relatedId: notification.relatedId,
      createdAt: notification.createdAt,
      isRead: notification.isRead
    };

    // If it has a specific recipient (User ID)
    if (notification.userId) {
      io.to(`user:${notification.userId}`).emit('notification:new', eventData);
    } 
    // If it's targeted at a role
    else if (notification.recipientRole) {
      io.to(`role:${notification.recipientRole}`).emit('notification:new', eventData);
    }
  } catch (err) {
    console.error('Socket Emit Error:', err.message);
  }
};

/**
 * Emit a general dashboard refresh event
 * @param {String} role - Role room to refresh
 */
const emitDashboardRefresh = (role) => {
  try {
    const io = getIO();
    io.to(`role:${role}`).emit('dashboard:refresh');
  } catch (err) {
    console.error('Socket Emit Error:', err.message);
  }
};

const emitGlobalEvent = (event, data) => {
  try {
    const io = getIO();
    io.emit(event, data);
  } catch (err) {
    console.error('Socket Global Emit Error:', err.message);
  }
};

/**
 * Emit an event to a specific user's socket room
 * @param {String} userId - The user's MongoDB _id
 * @param {String} event  - Socket event name
 * @param {*} data        - Payload to send
 */
const emitToUser = (userId, event, data) => {
  try {
    const io = getIO();
    io.to(`user:${userId}`).emit(event, data);
  } catch (err) {
    console.error('Socket emitToUser Error:', err.message);
  }
};

module.exports = {
  emitNotification,
  emitDashboardRefresh,
  emitGlobalEvent,
  emitToUser
};

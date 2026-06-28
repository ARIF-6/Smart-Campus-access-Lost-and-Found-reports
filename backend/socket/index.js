const socketio = require('socket.io');
const jwt = require('jsonwebtoken');

let io;

const initSocket = (server) => {
  io = socketio(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000
  });

  // Authentication Middleware
  io.use((socket, next) => {
    // Check various locations for the token
    const token = socket.handshake.auth?.token || 
                  socket.handshake.headers['authorization'] ||
                  socket.handshake.query?.token;
    
    if (!token) {
      console.log('Socket Auth Failed: Token missing');
      return next(new Error('Authentication error: Token missing'));
    }

    const cleanToken = token.startsWith('Bearer ') ? token.slice(7) : token;

    try {
      const decoded = jwt.verify(cleanToken, process.env.JWT_SECRET);
      socket.user = decoded;
      next();
    } catch (err) {
      console.log('Socket Auth Failed: Invalid token');
      return next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.user.id;
    const role = socket.user.role;

    console.log(`Socket connected: ${userId} (${role})`);

    // Join user-specific room
    socket.join(`user:${userId}`);
    
    // Join role-specific room
    socket.join(`role:${role}`);

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${userId}`);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
};

module.exports = { initSocket, getIO };

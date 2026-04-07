const { Server } = require("socket.io");

let io;

module.exports = {
  init: (httpServer) => {
    io = new Server(httpServer, {
      cors: {
        origin: "*",
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE"]
      }
    });
    return io;
  },
  getIO: () => {
    if (!io) {
      console.warn("Socket.io is not initialized yet.");
      return null;
    }
    return io;
  }
};

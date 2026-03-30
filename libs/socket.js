import { Server } from 'socket.io';
import http from 'http';
import express from 'express';

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        // Fixed the typo here: added //
        origin: ["https://cx-wh9z.onrender.com"], 
        credentials: true,
         transports: ["websocket", "polling"]
    },
    maxHttpBufferSize: 1e7,
});

const userSocketMap = {}; // {userId: socketId}

// Helper function to get receiver's socket ID
export const getReceiverSocketId = (receiverId) => {
    return userSocketMap[receiverId];
};

io.on("connection", (socket) => {
    const userId = socket.handshake.query.userId;
    
    // Only map if userId actually exists
    if (userId && userId !== "undefined") {
        userSocketMap[userId] = socket.id;
        console.log(`User connected: ${userId} with socket: ${socket.id}`);
    }

    // Broadcast the list of online users to everyone
    io.emit('getOnlineUsers', Object.keys(userSocketMap));

    socket.on("disconnect", () => {
        if (userId) {
            console.log("User disconnected:", userId);
            delete userSocketMap[userId];
        }
        io.emit('getOnlineUsers', Object.keys(userSocketMap));
    });
});

export { io, app, server };
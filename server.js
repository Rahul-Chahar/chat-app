const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');
const sequelize = require('./config/database');
const authRoutes = require('./routes/authRoutes');
const messageRoutes = require('./routes/messageRoutes');
const Message = require('./models/Message');
const User = require('./models/User');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/messages', messageRoutes);

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('A user connected');

    // Handle user joining
    socket.on('join', async (userData) => {
        console.log('User joined:', userData.name);
        socket.userId = userData.userId;
        socket.userName = userData.name;

        // Send user list to all clients
        io.emit('userList', Array.from(io.sockets.sockets.values())
            .map(s => ({ id: s.userId, name: s.userName }))
            .filter(user => user.id));

        // Send existing messages to newly joined user
        try {
            const messages = await Message.findAll({
                include: [{
                    model: User,
                    as: 'sender',
                    attributes: ['id', 'name']
                }],
                order: [['createdAt', 'ASC']],
                limit: 100 // Limit to last 100 messages
            });

            socket.emit('previousMessages', messages);
        } catch (error) {
            console.error('Error fetching messages:', error);
        }
    });

    // Handle new messages
    socket.on('sendMessage', async (data) => {
        try {
            // Save message to database
            const newMessage = await Message.create({
                message: data.text,
                senderId: socket.userId
            });

            // Fetch complete message with sender details
            const messageWithSender = await Message.findOne({
                where: { id: newMessage.id },
                include: [{
                    model: User,
                    as: 'sender',
                    attributes: ['id', 'name']
                }]
            });

            // Broadcast message to all clients
            io.emit('message', {
                id: messageWithSender.id,
                text: messageWithSender.message,
                sender: socket.userName,
                senderId: socket.userId,
                timestamp: messageWithSender.createdAt
            });

            console.log('Message saved and broadcast:', data.text);
        } catch (error) {
            console.error('Error saving/sending message:', error);
            socket.emit('messageError', { error: 'Failed to send message' });
        }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.userName);
        io.emit('userList', Array.from(io.sockets.sockets.values())
            .map(s => ({ id: s.userId, name: s.userName }))
            .filter(user => user.id));
    });

    // Heartbeat to maintain connection
    socket.on('heartbeat', () => {
        socket.emit('heartbeat-ack');
    });
});

// Database connection and server start
const PORT = process.env.PORT || 3000;

async function startServer() {
    try {
        // Test database connection
        await sequelize.authenticate();
        console.log('Database connection established successfully');

        // Sync database models
        await sequelize.sync();
        console.log('Database models synchronized');

        // Start server
        server.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    } catch (error) {
        console.error('Unable to start server:', error);
    }
}

startServer();

// Handle server shutdown gracefully
process.on('SIGTERM', async () => {
    console.log('Received SIGTERM signal');
    
    // Close server
    server.close(() => {
        console.log('HTTP server closed');
    });

    try {
        // Close database connection
        await sequelize.close();
        console.log('Database connection closed');
        process.exit(0);
    } catch (error) {
        console.error('Error during shutdown:', error);
        process.exit(1);
    }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});
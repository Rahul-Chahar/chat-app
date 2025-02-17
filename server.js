require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./models');

const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-group', (groupId) => {
    socket.join(`group-${groupId}`);
  });

  socket.on('leave-group', (groupId) => {
    socket.leave(`group-${groupId}`);
  });

  socket.on('send-message', (message) => {
    io.to(`group-${message.groupId}`).emit('new-message', message);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});
app.use(express.json());
app.use(express.static('public'));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// Create uploads directory if it doesn't exist
const fs = require('fs');
const uploadsDir = path.join(__dirname, process.env.UPLOAD_DIR || 'public/uploads');
if (!fs.existsSync(uploadsDir)){
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/groups', require('./routes/groups'));
app.use('/api/messages', require('./routes/messages'));

const PORT = process.env.PORT || 8000;

// Database connection and server startup
const startServer = async () => {
  try {
    console.log('Attempting to connect to database...');
    await db.sequelize.authenticate();
    console.log('Database connection has been established successfully.');

    console.log('Synchronizing database schema...');
    await db.sequelize.sync();
    console.log('Database synchronized successfully.');

    http.listen(PORT, '0.0.0.0', () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`Server URL: http://0.0.0.0:${PORT}`);
    });
  } catch (error) {
    console.error('Database connection error:', error.message);
    if (error.original) {
      console.error('Error details:', {
        code: error.original.code,
        errno: error.original.errno,
        sqlMessage: error.original.sqlMessage,
        sqlState: error.original.sqlState
      });
    }

    // Wait for 5 seconds before retrying
    console.log('Retrying connection in 5 seconds...');
    setTimeout(startServer, 5000);
  }
};

// Start the server
console.log('Starting server...');
startServer();
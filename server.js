require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const http = require('http');
const socketIo = require('socket.io');
const cron = require('node-cron');
const db = require('./models');
const { archiveOldMessages } = require('./services/archiveService');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: "*", methods: ["GET", "POST"] } });
const PORT = process.env.PORT || 8000;
const uploadsDir = path.join(__dirname, process.env.UPLOAD_DIR || 'public/uploads');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/uploads', express.static(uploadsDir));

// Ensure uploads directory exists
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// Socket.io event handling
io.on('connection', (socket) => {
  socket.on('join-group', (groupId) => socket.join(`group-${groupId}`));
  socket.on('leave-group', (groupId) => socket.leave(`group-${groupId}`));
  socket.on('send-message', (message) => io.to(`group-${message.groupId}`).emit('new-message', message));
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/groups', require('./routes/groups'));
app.use('/api/messages', require('./routes/messages'));

// Scheduled tasks
cron.schedule('0 0 * * *', archiveOldMessages); // Daily message archiving
cron.schedule('0 0 * * 0', async () => { 
  console.log('Running weekly file cleanup job');
  await cleanupOldFiles();
});

// Database and server initialization
(async () => {
  try {
    await db.sequelize.authenticate();
    await db.sequelize.sync();
    server.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
  } catch (error) {
    console.error('Database error:', error);
    setTimeout(() => process.exit(1), 5000);
  }
})();

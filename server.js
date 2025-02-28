require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./models');
const { archiveOldMessages } = require('./services/archiveService');
const cron = require('node-cron');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

const fs = require('fs');
const uploadsDir = path.join(__dirname, process.env.UPLOAD_DIR || 'public/uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

io.on('connection', (socket) => {
  socket.on('join-group', (groupId) => socket.join(`group-${groupId}`));
  socket.on('leave-group', (groupId) => socket.leave(`group-${groupId}`));
  socket.on('send-message', (message) => io.to(`group-${message.groupId}`).emit('new-message', message));
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/groups', require('./routes/groups'));
app.use('/api/messages', require('./routes/messages'));

const PORT = process.env.PORT || 8000;

// Schedule message archiving every day at midnight
cron.schedule('0 0 * * 0', async () => {
  console.log('Running weekly file cleanup job');
  await cleanupOldFiles();
});

(async () => {
  try {
    await db.sequelize.authenticate();
    await db.sequelize.sync();
    http.listen(PORT, '0.0.0.0', () => console.log(`Server running at http://0.0.0.0:${PORT}`));
  } catch (error) {
    console.error('Database error:', error);
    setTimeout(() => process.exit(1), 5000);
  }
})();
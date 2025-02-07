const express = require('express');
const app = express();
const cors = require('cors');
const mongoose = require('mongoose');
const http = require('http').createServer(app);
const io = require('socket.io')(http);

require('dotenv').config();

const users = new Map();

io.on('connection', (socket) => {
    socket.on('join', (userData) => {
        users.set(socket.id, userData);
        io.emit('userList', Array.from(users.values()));
    });

    socket.on('sendMessage', (message) => {
        io.emit('message', message);
    });

    socket.on('disconnect', () => {
        users.delete(socket.id);
        io.emit('userList', Array.from(users.values()));
    });
});


app.use(cors({
    origin: process.env.CLIENT_URL,
    methods: ['GET', 'POST'],
    credentials: true
}));

app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use(express.static('public'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
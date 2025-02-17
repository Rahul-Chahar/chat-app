const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const db = require('../models');
const multer = require('multer');
const path = require('path');

// Configure multer for file upload
const storage = multer.diskStorage({
    destination: './public/uploads/',
    filename: function(req, file, cb) {
        cb(null, 'file-' + Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10000000 }, // 10MB limit
    fileFilter: function(req, file, cb) {
        checkFileType(file, cb);
    }
});

// Check file type
function checkFileType(file, cb) {
    const filetypes = /jpeg|jpg|png|gif|mp4|webm|mp3|wav|pdf|doc|docx/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb('Error: Invalid file type!');
    }
}

// Check if user is member of the group
async function isGroupMember(userId, groupId) {
    const membership = await db.userGroups.findOne({
        where: {
            userId,
            groupId
        }
    });
    return !!membership;
}

router.post('/:groupId', auth, upload.single('file'), async (req, res) => {
    try {
        const groupId = req.params.groupId;

        // Check if user is still a member of the group
        const isMember = await isGroupMember(req.user.id, groupId);
        if (!isMember) {
            return res.status(403).json({ error: 'You are not a member of this group' });
        }

        const content = req.body.content || '';
        const messageData = {
            content,
            userId: req.user.id,
            groupId: groupId,
            timestamp: new Date()
        };

        if (req.file) {
            messageData.fileUrl = `/uploads/${req.file.filename}`;
            messageData.fileType = req.file.mimetype;
        }

        const message = await db.messages.create(messageData);

        // Fetch the created message with user details
        const messageWithUser = await db.messages.findOne({
            where: { id: message.id },
            include: [{
                model: db.users,
                attributes: ['username', 'id']
            }]
        });

        res.json(messageWithUser);
    } catch (err) {
        console.error('Message creation error:', err);
        res.status(500).json({ error: err.message });
    }
});

router.get('/:groupId', auth, async (req, res) => {
    try {
        const groupId = req.params.groupId;

        // Check if user is still a member of the group
        const isMember = await isGroupMember(req.user.id, groupId);
        if (!isMember) {
            return res.status(403).json({ error: 'You are not a member of this group' });
        }

        const messages = await db.messages.findAll({
            where: { groupId: groupId },
            include: [{
                model: db.users,
                attributes: ['username', 'id']
            }],
            order: [['timestamp', 'ASC']],
            limit: 50
        });
        res.json(messages);
    } catch (err) {
        console.error('Message retrieval error:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
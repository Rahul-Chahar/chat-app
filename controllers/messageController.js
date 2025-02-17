
const db = require('../models');

async function isGroupMember(userId, groupId) {
    const membership = await db.userGroups.findOne({
        where: {
            userId,
            groupId
        }
    });
    return !!membership;
}

exports.createMessage = async (req, res) => {
    try {
        const groupId = req.params.groupId;

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
};

exports.getMessages = async (req, res) => {
    try {
        const groupId = req.params.groupId;

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
};

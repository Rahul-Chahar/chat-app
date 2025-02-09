const Message = require('../models/Message');
const User = require('../models/User');

exports.getAllMessages = async (req, res) => {
    try {
        const messages = await Message.findAll({
            include: [{
                model: User,
                as: 'sender',
                attributes: ['id', 'name']
            }],
            order: [['createdAt', 'ASC']],
            limit: 100
        });

        res.status(200).json(messages);
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ message: "Error fetching messages" });
    }
};

exports.sendMessage = async (req, res) => {
    try {
        const { message } = req.body;
        const senderId = req.user.id;

        const newMessage = await Message.create({
            message,
            senderId
        });

        res.status(201).json(newMessage);
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ message: "Error sending message" });
    }
};
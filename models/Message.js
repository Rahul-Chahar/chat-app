const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Message = sequelize.define('Message', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    message: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    senderId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'Users',
            key: 'id'
        }
    },
    receiverId: {
        type: DataTypes.INTEGER,
        allowNull: true, // null for group messages
        references: {
            model: 'Users',
            key: 'id'
        }
    },
    isGroupMessage: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    }
}, {
    timestamps: true // This will add createdAt and updatedAt fields
});

module.exports = Message;
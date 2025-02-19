
const db = require('../models');
const { Op } = require('sequelize');

const archiveOldMessages = async () => {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  try {
    // Get old messages
    const oldMessages = await db.messages.findAll({
      where: {
        timestamp: {
          [Op.lt]: oneDayAgo
        }
      }
    });

    // Archive messages
    if (oldMessages.length > 0) {
      const archiveData = oldMessages.map(msg => ({
        content: msg.content,
        timestamp: msg.timestamp,
        fileUrl: msg.fileUrl,
        fileType: msg.fileType,
        originalUserId: msg.userId,
        originalGroupId: msg.groupId
      }));

      await db.archivedMessages.bulkCreate(archiveData);

      // Delete old messages
      await db.messages.destroy({
        where: {
          timestamp: {
            [Op.lt]: oneDayAgo
          }
        }
      });

      console.log(`Archived ${oldMessages.length} messages`);
    }
  } catch (error) {
    console.error('Archive process failed:', error);
  }
};

module.exports = { archiveOldMessages };

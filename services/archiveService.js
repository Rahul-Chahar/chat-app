const db = require('../models');
const { Op } = require('sequelize');
const { S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3');

// Initialize S3 client if environment variables are set
let s3Client = null;
if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY && process.env.AWS_REGION) {
  s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
  });
}

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

// Add a function to clean up old files from S3
const cleanupOldFiles = async () => {
  try {
    // Define the cutoff date (files older than 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    // Find archived messages with files that are older than 30 days
    const oldArchivedMessages = await db.archivedMessages.findAll({
      where: {
        timestamp: {
          [Op.lt]: thirtyDaysAgo
        },
        fileUrl: {
          [Op.ne]: null
        }
      }
    });
    
    console.log(`Found ${oldArchivedMessages.length} old files to clean up`);
    
    // Delete files from S3 or local storage
    for (const message of oldArchivedMessages) {
      if (message.fileUrl) {
        try {
          // If it's an S3 URL
          if (message.fileUrl.includes('.s3.') && s3Client) {
            const key = message.fileUrl.split('.com/')[1];
            const command = new DeleteObjectCommand({
              Bucket: process.env.AWS_BUCKET_NAME,
              Key: key
            });
            await s3Client.send(command);
          } 
          // If it's a local file
          else if (message.fileUrl.startsWith('/uploads/')) {
            const fs = require('fs');
            const path = require('path');
            const filePath = path.join(__dirname, '..', 'public', message.fileUrl);
            
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
            }
          }
          
          // Update the message to remove the file reference
          await message.update({ fileUrl: null, fileType: null });
        } catch (fileErr) {
          console.error(`Error deleting file ${message.fileUrl}:`, fileErr);
        }
      }
    }
    
    console.log('File cleanup completed');
  } catch (error) {
    console.error('File cleanup failed:', error);
  }
};

module.exports = { archiveOldMessages, cleanupOldFiles };
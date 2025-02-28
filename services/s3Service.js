const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

const uploadFile = async (file, key) => {
  try {
    if (!file || !file.buffer) {
      throw new Error('Invalid file data');
    }
    
    const command = new PutObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype
    });

    await s3Client.send(command);
    return `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
  } catch (error) {
    console.error('S3 upload error:', error);
    
    // Fall back to local storage if S3 fails or isn't configured
    if (!process.env.AWS_BUCKET_NAME || !process.env.AWS_REGION) {
      return saveFileLocally(file, key);
    }
    
    throw error;
  }
};

// Add local file saving as fallback
const fs = require('fs');
const path = require('path');

const saveFileLocally = async (file, key) => {
  const uploadsDir = path.join(__dirname, '..', process.env.UPLOAD_DIR || 'public/uploads');
  
  // Ensure directory exists
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  
  const filename = key.split('/').pop();
  const filepath = path.join(uploadsDir, filename);
  
  await fs.promises.writeFile(filepath, file.buffer);
  
  // Return public URL
  return `/uploads/${filename}`;
};

const getSignedDownloadUrl = async (key) => {
  try {
    const command = new GetObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key
    });
    return await getSignedUrl(s3Client, command, { expiresIn: 3600 });
  } catch (error) {
    console.error('Error generating signed URL:', error);
    
    // If the key points to a local file, return the local path
    if (key.startsWith('/uploads/')) {
      return key;
    }
    
    throw error;
  }
};

module.exports = { uploadFile, getSignedDownloadUrl, saveFileLocally };

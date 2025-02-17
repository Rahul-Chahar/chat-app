const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const messageController = require('../controllers/messageController');
const multer = require('multer');
const path = require('path');

const storage = multer.memoryStorage();

const upload = multer({
    storage: storage,
    limits: { fileSize: 10000000 },
    fileFilter: function(req, file, cb) {
        const filetypes = /jpeg|jpg|png|gif|mp4|webm|mp3|wav|pdf|doc|docx/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb('Error: Invalid file type!');
        }
    }
});

router.post('/:groupId', auth, upload.single('file'), messageController.createMessage);
router.get('/:groupId', auth, messageController.getMessages);

module.exports = router;
const router = require('express').Router();
const messageController = require('../controllers/messageController');
const auth = require('../middleware/auth');

router.get('/all', auth, messageController.getAllMessages);
router.post('/send', auth, messageController.sendMessage);

module.exports = router;
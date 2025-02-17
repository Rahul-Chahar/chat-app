const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const groupController = require('../controllers/groupController');

router.post('/', auth, groupController.createGroup);
router.get('/', auth, groupController.getUserGroups);
router.post('/:groupId/invite', auth, groupController.inviteUser);
router.get('/:groupId/members', auth, groupController.getGroupMembers);

module.exports = router;
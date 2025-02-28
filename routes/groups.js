const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const groupController = require('../controllers/groupController');

router.post('/', auth, groupController.createGroup);
router.get('/', auth, groupController.getUserGroups);
router.post('/:groupId/invite', auth, groupController.inviteUser);
router.get('/:groupId/members', auth, groupController.getGroupMembers);
// Add these new routes
router.post('/:groupId/admins', auth, groupController.makeAdmin);
router.delete('/:groupId/admins/:userId', auth, groupController.removeAdmin);
router.delete('/:groupId/users/:userId', auth, groupController.removeMember);

module.exports = router;
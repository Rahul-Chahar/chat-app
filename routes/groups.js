const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const db = require('../models');

// Create a new group
router.post('/', auth, async (req, res) => {
  try {
    const { name, description } = req.body;
    const group = await db.groups.create({ name, description });
    // Set creator as admin
    await group.addUser(req.user.id, { through: { isAdmin: true } });

    // Fetch the created group with UserGroups data
    const groupWithData = await db.groups.findOne({
      where: { id: group.id },
      include: [{
        model: db.users,
        where: { id: req.user.id },
        attributes: [],
        through: { attributes: ['isAdmin'] }
      }]
    });

    res.json(groupWithData);
  } catch (err) {
    console.error('Group creation error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get user's groups
router.get('/', auth, async (req, res) => {
  try {
    const groups = await db.groups.findAll({
      include: [{
        model: db.users,
        where: { id: req.user.id },
        attributes: ['id', 'username'],
        through: { attributes: ['isAdmin'] }
      }],
      raw: false,
      nest: true
    });

    // Transform the data to include UserGroups info
    const transformedGroups = groups.map(group => {
      const { users, ...groupData } = group.get({ plain: true });
      return {
        ...groupData,
        UserGroups: users[0]?.UserGroups || { isAdmin: false }
      };
    });

    res.json(transformedGroups);
  } catch (err) {
    console.error('Error fetching groups:', err);
    res.status(500).json({ error: err.message });
  }
});

// Check if user is admin of the group
async function isGroupAdmin(userId, groupId) {
  const userGroup = await db.sequelize.models.UserGroups.findOne({
    where: {
      userId,
      groupId,
      isAdmin: true
    }
  });
  return !!userGroup;
}

// Add user to group (invite)
router.post('/:groupId/invite', auth, async (req, res) => {
  try {
    const { email } = req.body;
    const groupId = req.params.groupId;

    // Check if user is admin
    if (!await isGroupAdmin(req.user.id, groupId)) {
      return res.status(403).json({ msg: 'Only admins can invite users' });
    }

    // Find user by email
    const userToInvite = await db.users.findOne({ where: { email } });
    if (!userToInvite) {
      return res.status(404).json({ msg: 'User not found' });
    }

    const group = await db.groups.findByPk(groupId);
    await group.addUser(userToInvite.id, { through: { isAdmin: false } });

    res.json({ msg: 'User invited successfully' });
  } catch (err) {
    res.status(500).send('Server error');
  }
});

// Make user admin
router.post('/:groupId/admins', auth, async (req, res) => {
  try {
    const { userId } = req.body;
    const groupId = req.params.groupId;

    // Check if requester is admin
    if (!await isGroupAdmin(req.user.id, groupId)) {
      return res.status(403).json({ msg: 'Only admins can manage other admins' });
    }

    await db.sequelize.models.UserGroups.update(
      { isAdmin: true },
      { where: { userId, groupId } }
    );

    res.json({ msg: 'User promoted to admin' });
  } catch (err) {
    res.status(500).send('Server error');
  }
});

// Remove user from group
router.delete('/:groupId/users/:userId', auth, async (req, res) => {
  try {
    const { groupId, userId } = req.params;

    // Check if requester is admin
    if (!await isGroupAdmin(req.user.id, groupId)) {
      return res.status(403).json({ msg: 'Only admins can remove users' });
    }

    const group = await db.groups.findByPk(groupId);
    await group.removeUser(userId);

    res.json({ msg: 'User removed from group' });
  } catch (err) {
    res.status(500).send('Server error');
  }
});

// Remove admin status
router.delete('/:groupId/admins/:userId', auth, async (req, res) => {
  try {
    const { groupId, userId } = req.params;

    // Check if requester is admin
    if (!await isGroupAdmin(req.user.id, groupId)) {
      return res.status(403).json({ msg: 'Only admins can manage other admins' });
    }

    await db.sequelize.models.UserGroups.update(
      { isAdmin: false },
      { where: { userId, groupId } }
    );

    res.json({ msg: 'Admin status removed' });
  } catch (err) {
    res.status(500).send('Server error');
  }
});

// Get group members
router.get('/:groupId/members', auth, async (req, res) => {
  try {
    const group = await db.groups.findByPk(req.params.groupId, {
      include: [{
        model: db.users,
        attributes: ['id', 'username', 'email'],
        through: { attributes: ['isAdmin'] }
      }]
    });

    if (!group) {
      return res.status(404).json({ msg: 'Group not found' });
    }

    // Check if requester is member of the group
    const isMember = await group.hasUser(req.user.id);
    if (!isMember) {
      return res.status(403).json({ msg: 'Not a member of this group' });
    }

    const members = group.users.map(user => ({
      id: user.id,
      username: user.username,
      email: user.email,
      isAdmin: user.UserGroups.isAdmin
    }));

    res.json(members);
  } catch (err) {
    console.error('Error fetching group members:', err);
    res.status(500).send('Server error');
  }
});

module.exports = router;
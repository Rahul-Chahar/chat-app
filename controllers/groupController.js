
const db = require('../models');

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

exports.createGroup = async (req, res) => {
  try {
    const { name, description } = req.body;
    const group = await db.groups.create({ name, description });
    await group.addUser(req.user.id, { through: { isAdmin: true } });

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
};

exports.getUserGroups = async (req, res) => {
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
};

exports.inviteUser = async (req, res) => {
  try {
    const { email } = req.body;
    const groupId = req.params.groupId;

    if (!await isGroupAdmin(req.user.id, groupId)) {
      return res.status(403).json({ msg: 'Only admins can invite users' });
    }

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
};

exports.getGroupMembers = async (req, res) => {
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
};

exports.makeAdmin = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { userId } = req.body;
    
    // Check if requester is an admin
    if (!await isGroupAdmin(req.user.id, groupId)) {
      return res.status(403).json({ msg: 'Only admins can promote users' });
    }

    // Update user to admin in the group
    const userGroup = await db.userGroups.findOne({
      where: { 
        userId: userId,
        groupId: groupId
      }
    });

    if (!userGroup) {
      return res.status(404).json({ msg: 'User is not a member of this group' });
    }

    await userGroup.update({ isAdmin: true });
    res.json({ msg: 'User promoted to admin successfully' });
  } catch (err) {
    console.error('Error making admin:', err);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
};

exports.removeAdmin = async (req, res) => {
  try {
    const { groupId, userId } = req.params;
    
    // Check if requester is an admin
    if (!await isGroupAdmin(req.user.id, groupId)) {
      return res.status(403).json({ msg: 'Only admins can demote users' });
    }

    // Prevent removing the last admin
    const admins = await db.userGroups.findAll({
      where: {
        groupId: groupId,
        isAdmin: true
      }
    });

    if (admins.length <= 1 && admins[0].userId.toString() === userId) {
      return res.status(400).json({ msg: 'Cannot remove the last admin of the group' });
    }

    // Update user to remove admin status
    const userGroup = await db.userGroups.findOne({
      where: { 
        userId: userId,
        groupId: groupId
      }
    });

    if (!userGroup) {
      return res.status(404).json({ msg: 'User is not a member of this group' });
    }

    await userGroup.update({ isAdmin: false });
    res.json({ msg: 'Admin status removed successfully' });
  } catch (err) {
    console.error('Error removing admin:', err);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
};

exports.removeMember = async (req, res) => {
  try {
    const { groupId, userId } = req.params;
    
    // Check if requester is an admin
    if (!await isGroupAdmin(req.user.id, groupId)) {
      return res.status(403).json({ msg: 'Only admins can remove users' });
    }

    // Prevent removing yourself through this endpoint
    if (req.user.id.toString() === userId) {
      return res.status(400).json({ msg: 'Cannot remove yourself. Use leave group instead.' });
    }

    // Check if user is the last admin
    const userGroup = await db.userGroups.findOne({
      where: { 
        userId: userId,
        groupId: groupId
      }
    });

    if (!userGroup) {
      return res.status(404).json({ msg: 'User is not a member of this group' });
    }

    // If user is admin, check if they're the last admin
    if (userGroup.isAdmin) {
      const admins = await db.userGroups.findAll({
        where: {
          groupId: groupId,
          isAdmin: true
        }
      });

      if (admins.length <= 1) {
        return res.status(400).json({ msg: 'Cannot remove the last admin of the group' });
      }
    }

    // Remove user from group
    await userGroup.destroy();
    res.json({ msg: 'User removed from group successfully' });
  } catch (err) {
    console.error('Error removing member:', err);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
};
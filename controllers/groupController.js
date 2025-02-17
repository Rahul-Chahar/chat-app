
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

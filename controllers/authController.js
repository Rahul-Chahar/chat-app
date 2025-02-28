const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../models');

exports.register = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (await db.users.findOne({ where: { email } })) {
      return res.status(400).json({ msg: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await db.users.create({ username, email, password: hashedPassword });

    const token = jwt.sign({ user: { id: user.id } }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token });
  } catch (err) {
    res.status(500).send('Server error');
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await db.users.findOne({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }

    await user.update({ isOnline: true });
    const token = jwt.sign({ user: { id: user.id } }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token });
  } catch (err) {
    res.status(500).send('Server error');
  }
};

exports.getUser = async (req, res) => {
  try {
    const user = await db.users.findByPk(req.user.id, { attributes: { exclude: ['password'] } });
    res.json(user);
  } catch (err) {
    res.status(500).send('Server error');
  }
};

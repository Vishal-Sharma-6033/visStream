const User = require('../models/User');
const generateToken = require('../utils/generateToken');

// POST /api/auth/register
const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password)
      return res.status(400).json({ message: 'username, email and password are required' });
    if (password.length < 6)
      return res.status(400).json({ message: 'Password must be at least 6 characters' });

    const conflict = await User.findOne({ $or: [{ email }, { username }] });
    if (conflict)
      return res.status(400).json({ message: conflict.email === email ? 'Email already in use' : 'Username already taken' });

    const color = ['6c63ff','3b82f6','ec4899','10b981','f59e0b'][Math.floor(Math.random() * 5)];
    const user = await User.create({
      username,
      email,
      passwordHash: password,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=${color}&color=fff&bold=true&size=128`,
    });

    res.status(201).json({ token: generateToken(user._id), user: user.toJSON() });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ message: 'Registration failed' });
  }
};

// POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: 'Email and password are required' });

    const user = await User.findOne({ email });
    if (!user || !(await user.matchPassword(password)))
      return res.status(401).json({ message: 'Invalid email or password' });

    res.json({ token: generateToken(user._id), user: user.toJSON() });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Login failed' });
  }
};

// GET /api/auth/me
const getMe = (req, res) => res.json({ user: req.user });

module.exports = { register, login, getMe };

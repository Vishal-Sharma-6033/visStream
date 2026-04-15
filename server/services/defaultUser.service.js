const User = require('../models/User');

const parseBool = (value, fallback) => {
  if (value == null) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
};

const createAvatarUrl = (username) => {
  const color = ['3b82f6', '10b981', 'f59e0b', 'ef4444', '6366f1'][Math.floor(Math.random() * 5)];
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=${color}&color=fff&bold=true&size=128`;
};

const toUsernameSlug = (value) => {
  const base = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 24);
  return base.length >= 3 ? base : 'testuser';
};

const ensureUniqueUsername = async (preferred) => {
  const base = toUsernameSlug(preferred);
  for (let i = 0; i < 1000; i += 1) {
    const suffix = i === 0 ? '' : String(i);
    const candidate = `${base}${suffix}`.slice(0, 30);
    const exists = await User.exists({ username: candidate });
    if (!exists) return candidate;
  }
  throw new Error('Unable to generate unique username for default test user');
};

const ensureDefaultTestUser = async () => {
  const enabled = parseBool(process.env.ENABLE_DEFAULT_TEST_USER, process.env.NODE_ENV !== 'production');
  if (!enabled) return;

  const email = (process.env.DEFAULT_TEST_EMAIL || 'test@gmail.com').trim().toLowerCase();
  const password = String(process.env.DEFAULT_TEST_PASSWORD || '123123');
  const preferredUsername = process.env.DEFAULT_TEST_USERNAME || 'testuser';

  const existing = await User.findOne({ email });
  if (existing) {
    const hasExpectedPassword = await existing.matchPassword(password);
    if (!hasExpectedPassword) {
      existing.passwordHash = password;
      await existing.save();
      console.log(`🧪  Updated default test user password: ${email} / ${password}`);
      return;
    }

    console.log(`🧪  Default test user ready: ${email}`);
    return;
  }

  const username = await ensureUniqueUsername(preferredUsername);

  await User.create({
    username,
    email,
    passwordHash: password,
    avatar: createAvatarUrl(username),
  });

  console.log(`🧪  Created default test user: ${email} / ${password}`);
};

module.exports = { ensureDefaultTestUser };
const validateEnv = () => {
  const recommended = ['MONGO_URI', 'JWT_SECRET'];
  const missing = recommended.filter((k) => !process.env[k]);
  if (missing.length) {
    console.warn(`⚠️  Missing env vars (using defaults): ${missing.join(', ')}`);
    console.warn('    Copy server/.env.example → server/.env and fill in values.\n');
  }
};

module.exports = { validateEnv };

const format = (level, message) => {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] [${level}] ${message}`;
};

module.exports = {
  info(message) {
    console.log(format("INFO", message));
  },
  warn(message) {
    console.warn(format("WARN", message));
  },
  error(message, error) {
    console.error(format("ERROR", message));
    if (error) {
      console.error(error);
    }
  }
};

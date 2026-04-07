require("dotenv").config();

const http = require("http");
const app = require("./server/app");
const connectDB = require("./server/utils/db");
const configureSocket = require("./server/socket");
const logger = require("./server/utils/logger");

const PORT = process.env.PORT || 5000;

async function bootstrap() {
  await connectDB();

  const server = http.createServer(app);
  configureSocket(server);

  server.listen(PORT, () => {
    logger.info(`visStream backend running on port ${PORT}`);
  });
}

bootstrap().catch((error) => {
  logger.error("Failed to start server", error);
  process.exit(1);
});

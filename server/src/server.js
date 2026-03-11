import dotenv from "dotenv";
import http from "http";
import app from "./app.js";
import connectDB from "./config/db.js";
import { setupSocket } from "./config/socket.js";

dotenv.config();

const port = process.env.PORT || 5000;

connectDB();

const server = http.createServer(app);
setupSocket(server);

server.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});

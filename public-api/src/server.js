import dotenv from "dotenv";
import app from "./app.js";
import connectDB from "./config/db.js";

dotenv.config();

const port = Number.parseInt(process.env.PORT || "5100", 10);

const startServer = async () => {
  await connectDB();

  app.listen(port, () => {
    console.log(`JobHuntr Public API running on http://localhost:${port}`);
  });
};

startServer().catch((error) => {
  console.error("Failed to start public API:", error.message);
  process.exit(1);
});

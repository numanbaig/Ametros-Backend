import { makeServer } from "./src/server";
import { connectToDatabase } from "./src/db";

export const start = async () => {
  console.log("🚀 Starting server...");

  const server = makeServer();

  // ✅ Connect to the database
  await connectToDatabase();

  // ✅ Start the server
  await server.start();
};

start().catch((err) => {
  console.error("❌ Server failed to start:", err);
});

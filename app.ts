import { makeServer } from "./src/server";
import { connectToDatabase } from "./src/db";

export const start = async () => {
  console.log("Starting server...");
  const server = makeServer();
  server.start();
  connectToDatabase();
};

start();

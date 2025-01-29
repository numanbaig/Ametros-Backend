import dotenv from "dotenv";

dotenv.config();

export const config = {
  SERVER_PORT: process.env.PORT || 5000,
  JWT_SECRET: process.env.JWT_SECRET || "",
};

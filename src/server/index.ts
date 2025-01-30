import { randomBytes } from "crypto";
import express, { Request, Response, NextFunction } from "express";
import ROUTES from "../routes/index";
import makeApi from "../utils/make-api";
import { config } from "../config";
import cors from "cors";

const MAX_PAYLOAD_SIZE = "5mb";

export const makeServer = () => {
  // Initialize API
  //@ts-ignore
  const api = makeApi("openapi.yaml", ROUTES);
  const app = express();

  // ✅ Fix: Enable CORS with credentials support
  app.use(
    cors({
      origin: "http://localhost:3000",
      credentials: true,
    })
  );

  // Ensure CORS handles preflight requests correctly
  app.options(
    "https://localhost:3000",
    cors({
      origin: "http://localhost:3000", // Frontend URL
      credentials: true, // Allow cookies in requests
    })
  );

  // ✅ Ensure Express parses JSON properly
  app.use(express.json({ limit: MAX_PAYLOAD_SIZE }));

  // Middleware to generate `requestId`
  app.all("*", (req: Request, res: Response, next: NextFunction) => {
    const requestId =
      req.headers["x-request-id"] ||
      req.headers["request-id"] ||
      randomBytes(4).toString("hex");

    //@ts-ignore
    req.requestId = requestId;
    return next();
  });

  // ✅ Fix: Properly handle requests and responses
  app.use(async (req: Request, res: Response) => {
    const handler = await api;

    return await handler.handleRequest(req as any, req as any, res as any);
  });

  return {
    app,
    start: () => {
      return new Promise<() => void>((resolve, reject) => {
        const server = app.listen(config.SERVER_PORT, () => {
          console.log(`✅ Server started on port ${config.SERVER_PORT}`);
          resolve(() => server.close());
        });
        server.on("error", reject);
      });
    },
  };
};

import { randomBytes } from "crypto";
import express from "express";
import ROUTES from "../routes/index";
import makeApi from "../utils/make-api";
import { config } from "../config";
import cors from "cors";

const MAX_PAYLOAD_SIZE = "5mb";

export const makeServer = () => {
  //@ts-ignore
  const api = makeApi("openapi.yaml", ROUTES);
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: MAX_PAYLOAD_SIZE }));

  // to upload files to s3
  //   app.use(fileUpload());

  app.all("*", (req, res, next) => {
    const requestId =
      req.headers["x-request-id"] ||
      req.headers["request-id"] ||
      randomBytes(4).toString("hex");

    //@ts-ignore
    req.requestId = requestId;
    return next(); // Call the next middleware or handler
  });

  app.use(async (req, res) => {
    const handler = await api;
    return await handler.handleRequest(req as any, req, res);
  });

  return {
    app,
    start: () => {
      return new Promise<() => void>((resolve, reject) => {
        const server = app.listen(config.SERVER_PORT, () => {
          console.log(`started server on port:${config.SERVER_PORT}`);
          resolve(() => server.close());
        });
        server.on("error", reject);
      });
    },
  };
};

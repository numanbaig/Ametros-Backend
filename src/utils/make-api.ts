import OpenAPIBackend from "openapi-backend";
import { Handler as APIHandler } from "openapi-backend";
import { Boom } from "@hapi/boom";
import axios from "axios";
import https from "http-status";
import { operations } from "../types/gen";
import JWT from "jsonwebtoken";

const {
  NOT_FOUND,
  FORBIDDEN,
  UNAUTHORIZED,
  BAD_REQUEST,
  OK,
  REQUEST_TIMEOUT,
  INTERNAL_SERVER_ERROR,
} = https;

export type Operation = keyof operations;

type FullOp<O extends Operation> = operations[O] & {
  parameters: {
    path: {};
    query: {};
  };
  requestBody: {
    content: {
      "application/json": {};
    };
  };
  responses: {
    "200": {
      content: {
        "application/json": {} | void;
      };
    };
  };
};

// full request type of an operation -- query + parameters + requestBody
export type FullRequest<O extends Operation> =
  FullOp<O>["parameters"]["query"] &
    FullOp<O>["parameters"]["path"] &
    FullOp<O>["requestBody"]["content"]["application/json"];
// the response type of an operation
export type Response<O extends Operation> =
  FullOp<O>["responses"]["200"]["content"]["application/json"];
// handle cleaned up request (type checks response too)

type TokenProps = {
  id: string;
  role: string;
};

export type RequestContext = {
  user: TokenProps;
};
// handle cleaned up request (type checks response too)
export type Handler<O extends Operation> = (
  ev: FullRequest<O>,
  ctx: RequestContext
) => Promise<Response<O>>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type APIResult = { statusCode: number; body: any };

const headers = {
  "content-type": "application/json",
  "access-control-allow-origin": "*", // lazy cors config
};

function errorHandlingWrap<O extends Operation>(
  handler: Handler<O>
): APIHandler {
  return async (e, req, res) => {
    const result = {} as APIResult;
    const fullRequest = {
      ...(e.request.query || {}),
      ...(e.request.requestBody || {}),
      ...(e.request.params || {}),
      ...(e.request.body || {}),
      ...req.files,
    };

    console.log("path", e.request.path, "fullRequest", fullRequest);

    try {
      // if the request had validation errors
      // throw the error
      if (e.validation?.errors) {
        console.error("validation error", e.validation.errors);
        throw new Boom("Invalid request", {
          statusCode: BAD_REQUEST,
          data: e.validation.errors,
        });
      }

      // if auth failed
      if (e.security && !e.security?.authorized && "webAuth" in e.security) {
        throw new Boom(`${e.security.webAuth.error}`, {
          statusCode: UNAUTHORIZED,
        });
      }

      const user: TokenProps | undefined = e.security?.webAuth;

      const response = await handler({ ...fullRequest }, { user: user! });
      result.body = response;
      result.statusCode = OK;
    } catch (error: any) {
      let errorDescription: string;
      let data: any;
      if (error instanceof Boom) {
        errorDescription = error.message;
        data = error.data;
        result.statusCode = error.output.statusCode;
      } else if (axios.isAxiosError(error)) {
        if (error.response) {
          errorDescription = error.response?.data?.message || error.message;
          result.statusCode = error.response?.status;
        } else if (error.code === "ECONNABORTED") {
          errorDescription = "An Internal Request Timed Out";
          result.statusCode = REQUEST_TIMEOUT;
        } else {
          errorDescription = "Internal Server Error";
          result.statusCode = INTERNAL_SERVER_ERROR;
        }
      } else {
        errorDescription = "Internal Server Error";
        result.statusCode = INTERNAL_SERVER_ERROR;
      }

      result.body = {
        error: errorDescription,
        statusCode: result.statusCode,
        message: error.message,
        data,
      };
    }

    if (typeof res?.status === "function") {
      return res.status(result.statusCode).set(headers).json(result.body);
    } else {
      return {
        statusCode: result.statusCode,
        body: JSON.stringify(result.body),
        headers,
      };
    }
  };
}

const makeApi = (
  definition: string,
  routes: { [K in Operation]: Handler<K> }
) => {
  // create api with your definition file or object
  const api = new OpenAPIBackend({
    definition,
    quick: process.env.NODE_ENV === "production",
    apiRoot: "/api",
  });

  // authenticate user using firebase
  api.registerSecurityHandler("webAuth", async (e) => {
    try {
      const headers = e?.request?.headers;
      const token = (headers?.Authorization || headers?.authorization)?.slice?.(
        7
      );
      if (!token || typeof token !== "string") {
        throw new Boom("No token", { statusCode: UNAUTHORIZED });
      }

      const decoded = JWT.verify(token, process.env.JWT_SECRET as string);
      if (!decoded) {
        throw new Boom("Insufficient Access", { statusCode: FORBIDDEN });
      }
      // console.log("decoded>>>>>>>>>", decoded)

      return decoded;
    } catch (error: any) {
      if (error instanceof Boom) {
        throw error;
      } else {
        throw new Boom(error?.message, {
          statusCode: error?.code || UNAUTHORIZED,
        });
      }
    }
  });

  api.register({
    notFound: errorHandlingWrap(async () => {
      throw new Boom("Not Found", { statusCode: NOT_FOUND });
    }),
    validationFail: errorHandlingWrap<any>(async () => {
      return async () => {};
    }),
    ...Object.keys(routes).reduce(
      (dict, key) => ({
        ...dict,
        //@ts-ignore
        [key]: errorHandlingWrap(routes[key]),
      }),
      {}
    ),
  });

  // initalize the backend
  return api.init();
};

export default makeApi;

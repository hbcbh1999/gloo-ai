import type { NextFunction, Request, Response } from "express";
import express from "express";
import morgan from "morgan";
import * as Sentry from "@sentry/node";
import { AxiosError } from "axios";
import cors from "cors";

import { GlooApiError, register } from "./api/generated";
import config from "./config";
import { OrgDao } from "./dao/OrgDao";
import { SecretDao } from "./dao/SecretDao";
import { stripeUsageMiddleware } from "./utils/billing";
const bodyParser = require("body-parser");
import classifierService from "./services/classifiers";
import classificationService from "./services/v1/classifier";

require("express-async-errors");

const app = express();

// move to infisical probably
function getDsn() {
  return config.STAGE === "dev"
    ? "https://176a439343554d55ab2f04aed4909007@o4504036221648896.ingest.sentry.io/4504993155645440"
    : "https://97ed6de22d264f79b1a35949259a75e7@o4504036221648896.ingest.sentry.io/4504725823815680";
}

Sentry.init({
  dsn: getDsn(),
  integrations: [
    // enable HTTP calls tracing
    new Sentry.Integrations.Http({ tracing: true }),
    // enable Express.js middleware tracing
    new Sentry.Integrations.Express({
      // to trace all requests to the default router
      app,
      // alternatively, you can specify the routes you want to trace:
      // router: someRouter,
    }),
  ],
  beforeSendTransaction(event: Sentry.Event) {
    // Modify or drop the event here
    if (event.transaction === "GET /") {
      // Don't send the event to Sentry
      return null;
    }
    return event;
  },

  // We recommend adjusting this value in production, or using tracesSampler
  // for finer control
  tracesSampler: (samplingContext) => {
    return 1.0;
  },
});
app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.tracingHandler());
app.use(cors());

app.use(bodyParser.json());
app.use(morgan("tiny"));
app.use(stripeUsageMiddleware);

app.get("/", (req, res) => {
  res.send({ status: "OK 200" });
});

app.get("/org/secrets", async (req, res) => {
  try {
    const secret = await SecretDao.load(req);
    secret.auth(req, { type: "GLOO_INTERNAL" });
    const secrets = await SecretDao.loadByOrg(secret.orgId(req));
    res.json(secrets.map((s) => s.toResponse()));
  } catch (err) {
    if (err instanceof GlooApiError) {
      console.log(err);
      res.status(400).json({ error: err.name, message: err.message });
    } else {
      console.log(err);
      res.status(400).json({ error: "Error getting secret" });
    }
  }
});

app.post("/org/secrets", async (req, res) => {
  console.log("reqbody", req.body, req.params);
  const { appScope = "ALL", name = "default" } = req.body;
  try {
    const _secret = await SecretDao.load(req);
    _secret.auth(req, { type: "GLOO_INTERNAL" });

    const { key, secret } = SecretDao.create(
      { orgId: _secret.orgId(req), name },
      appScope
    );
    await secret.save();
    res.json({ secretKey: key, secret: secret.toResponse() });
  } catch (err) {
    if (err instanceof GlooApiError) {
      res.status(400).json({ error: err.name, message: err.message });
    } else {
      console.log(err);
      res.status(400).json({ error: "Error creating secret" });
    }
  }
});

app.post("/org/secrets/update", async (req, res) => {
  const { secretId, name } = req.body;
  if (secretId === undefined) {
    return res.status(400).json({ error: "Expecting secretId" });
  }
  try {
    (await SecretDao.load(req)).auth(req, { type: "GLOO_INTERNAL" });

    const secret = await SecretDao.loadByVal(secretId);
    secret.update({ name });
    await secret.save();

    res.json(secret.toResponse());
  } catch (err) {
    if (err instanceof GlooApiError) {
      res.status(400).json({ error: err.name, message: err.message });
    } else {
      console.log(err);
      res.status(400).json({ error: "Error deleting secret" });
    }
  }
});

app.delete("/org/secrets", async (req, res) => {
  const { secretId } = req.body;
  if (secretId === undefined) {
    return res.status(400).json({ error: "Expecting secretId" });
  }
  try {
    (await SecretDao.load(req)).auth(req, { type: "GLOO_INTERNAL" });

    const secret = await SecretDao.loadByVal(secretId);
    await secret.delete();
    res.json({});
  } catch (err) {
    if (err instanceof GlooApiError) {
      res.status(400).json({ error: err.name, message: err.message });
    } else {
      console.log(err);
      res.status(400).json({ error: "Error deleting secret" });
    }
  }
});

app.post("/org", async (req, res) => {
  const { name, email } = req.body;

  if (name === undefined) {
    return res.status(400).json({ error: "Expecting name" });
  }
  if (email === undefined) {
    return res.status(400).json({ error: "Expecting email" });
  }

  try {
    const secret = await SecretDao.load(req);
    secret.auth(req, { type: "GLOO_INTERNAL" });

    const org = await OrgDao.create({ name, orgId: secret.orgId(req), email });
    await org.save();
    res.json(org.toResponse());
  } catch (err) {
    if (err instanceof GlooApiError) {
      res.status(400).json({ error: err.name, message: err.message });
    } else {
      console.log(err);
      res.status(400).json({ error: "Error creating org" });
    }
  }
});

app.get("/org", async (req, res) => {
  try {
    const secret = await SecretDao.load(req);
    secret.auth(req, { type: "GLOO_INTERNAL" });

    const org = await OrgDao.load(secret.orgId(req));
    res.json(org.toResponse());
  } catch (err) {
    if (err instanceof GlooApiError) {
      res.status(400).json({ error: err.name, message: err.message });
    } else {
      console.log(err);
      res.status(400).json({ error: "Error getting org" });
    }
  }
});

register(app, {
  classifiers: classifierService,
  v1: {
    classification: classificationService,
  },
});

app.use(Sentry.Handlers.errorHandler());
app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  // logic
  if (res.headersSent) {
    return next(error);
  }
  if (error instanceof AxiosError) {
    if (error.response) {
      console.error(
        "Unhandled error",
        error.response.status,
        error.response.statusText,
        error.response.data
      ); // => the response payload
    } else if (error.config) {
      console.error("Unhandled error", {
        stack: error.stack,
        message: error.message,
        url: error.config.url,
        method: error.config.method,
        data: error.config?.data?.substring(0, 500),
      });
    } else if (error.cause) {
      console.error("Unhandled error", error.cause);
    } else {
      console.error("Unhandled error", error);
    }
  } else {
    console.error("Unhandled error!", error);
  }
  res.status(500).json({ error: "Internal Server Error" });
});

app.listen(config.GLOO_SERVICE_PORT, () => {
  console.log(`🎉 Listening on port ${config.GLOO_SERVICE_PORT}...`);
});

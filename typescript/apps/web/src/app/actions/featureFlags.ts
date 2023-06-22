import { Client } from "@harnessio/ff-nodejs-server-sdk";
import type { SignedInAuthObject } from "@clerk/clerk-sdk-node";

import logger from "./logger";

// set apiKey to your SDK API Key
const apiKey = "fac50dc5-5c0b-402a-8014-b95aaf852658";

// Create Client
export enum FeatureFlags {
  Classification = "classification",
}

const ffClient = async () => {
  const client = new Client(apiKey, {
    enableAnalytics: false,
    enableStream: false,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
    logger: logger as any,
  });
  await client.waitForInitialization();
  return client;
};

export const getFlag = async (
  auth: Pick<SignedInAuthObject, "orgId" | "orgSlug">,
  flag: FeatureFlags
) => {
  return await ffClient().then((c) => {
    const res = c.boolVariation(
      flag,
      {
        identifier: auth.orgId ?? "unknown-org",
        name: auth.orgSlug ?? "unknown-org",
      },
      false
    );
    c.close();
    return res;
  });
};

/* eslint-disable @typescript-eslint/require-await */
import type { GlooClient } from "@gloo/client-internal";
import { createGlooClient } from "@gloo/client-internal";

import { localhostUrl, testSecret } from "./constants";

const testClassifierId = "8b612cdc-1a7f-4c78-a839-1a80d2ccb5c9";
// const datapointId = "447510b8-d711-4bf4-b1c6-5c0870f10adf"; // "000b5957-1b57-3f48-a517-94d636c5e155";
describe("Gloo integration tests", () => {
  let gloo: GlooClient;

  beforeEach(async () => {
    gloo = createGlooClient({
      secretKey: testSecret,
      baseUrl: localhostUrl,
      tag: "EXCLUDE:GLOO:UNIT_TEST",
    });
  });

  it("should classify text and save feedback", async () => {
    await gloo.qaClient().create({
      classifierId: testClassifierId,
      name: "testing123",
    });
  });
});

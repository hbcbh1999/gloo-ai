import assert from "assert";

import type {
  ClassificationRequest,
  ClassifierClient,
  GlooClient,
} from "@gloo/client-internal";
import { createGlooClient } from "@gloo/client-internal";

import { localhostUrl, testSecret } from "./constants";

const testClassifierId = "eb612cdc-1a7f-4c78-a839-1a80d2ccb5c9";

// describe("Gloo integration tests", () => {
//   let gloo: GlooClient;
//   let classifier: ClassifierClient | undefined;

//   beforeEach(async () => {
//     gloo = createGlooClient({
//       secretKey: testSecret,
//       // baseUrl: localhostUrl,
//       tag: "EXCLUDE:GLOO:UNIT_TEST",
//     });

//     classifier = gloo.classifierClientV1({ classifierId: testClassifierId });
//   });

//   it("should classify text and save feedback", async () => {
//     const request: ClassificationRequest = {
//       type: "text",
//       enableLowLatency: false,
//       languageHint: "en",
//       text: "Thanks for the help!",
//     };

//     assert(classifier, "classifier should be defined");
//     const classifyResponse = await classifier.classify(request);
//     console.log("classifyResponse", JSON.stringify(classifyResponse));
//     expect(classifyResponse).toBeDefined();
//     expect(classifyResponse?.classes).toBeDefined();
//     expect(classifyResponse?.classes).toContain("other/thank-you-message");
//     expect(classifyResponse?.classes?.length).toEqual(1);
//   });
// });

import { readFile } from "fs";

import { createGlooClient } from "@gloo/client-internal";

// eslint-disable-next-line @typescript-eslint/no-var-requires
interface Prediction {
  prediction_id: number;
  text: string;
}

// function to load JSON data
const loadJSONData = (filePath: string): Promise<Prediction[]> => {
  return new Promise((resolve, reject) => {
    readFile(filePath, "utf8", (err, data) => {
      if (err) {
        reject(err);
      } else {
        // Parse the data as JSON and put it into the array.
        const predictions = JSON.parse(data) as Prediction[];
        resolve(predictions);
      }
    });
  });
};

class RequestLimiter {
  private maxConcurrency: number;
  private currentConcurrency = 0;
  private queue: (() => void)[] = [];

  constructor(maxConcurrency: number) {
    this.maxConcurrency = maxConcurrency;
  }

  async request(req: () => Promise<void>): Promise<void> {
    if (this.currentConcurrency >= this.maxConcurrency) {
      // Wait until some request has finished if the limit is reached
      await new Promise((resolve) => this.queue.push(() => resolve(undefined)));
    }

    this.currentConcurrency++;

    return req()
      .then(() => {
        this.finishedRequest();
        return;
      })
      .catch((error) => {
        this.finishedRequest();
        console.log("Error", error);
        // throw error;
      });
  }

  private finishedRequest() {
    this.currentConcurrency--;
    // log every 5 requests
    if (this.currentConcurrency % 10 === 0) {
      console.log("Queue size", this.queue.length);
    }

    if (this.queue.length > 0) {
      const next = this.queue.shift();
      if (next) next();
    }
  }
}

// Usage

export const generate = async () => {
  console.log("Loading json data");
  const data = await loadJSONData("data/data-may1-text.json");
  console.log("Loaded data", data.length);

  const apiKey = "key";
  const testClassifierId = "123";
  const configIds = ["hybrid", "llm-default", "low-latency"];
  const versionId = -1;

  const glooClient = createGlooClient({
    secretKey: apiKey,
    baseUrl: "https://api.trygloo.com",
    tag: "gloo-test",
  });

  const limiter = new RequestLimiter(2);

  data.slice(0, 10).forEach((d, index) => {
    const configId = configIds[index % configIds.length]!;
    void limiter.request(async () => {
      await glooClient
        .classifierClientV1()
        .predict(testClassifierId, {
          text: d.text,
          tags: ["testing"],
          configuration: {
            id: configId,
            version: versionId,
          },
          llmTarget: "NONE",
        })
        .catch((error) => {
          console.log("Error", error);
        });
    });
  });
};

void generate();

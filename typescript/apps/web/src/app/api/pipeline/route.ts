import type { ConfigurationOverride } from "@gloo/client-internal";
import { createGlooClient } from "@gloo/client-internal";

export async function POST(request: Request) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const json = await request.json();
  const pipeRequest = json as {
    orgId: string;
    classifierId: string;
    input: string;
    config: ConfigurationOverride;
    llmTarget: string;
  };
  const gloo = createGlooClient({
    secretKey: process.env.GLOO_AUTH_SECRET ?? "",
    baseUrl: process.env.GLOO_SERVICE_URL,
    tag: "GLOO:DASHBOARD",
    org: pipeRequest.orgId,
  });
  const { classifierId, input, config, llmTarget } = pipeRequest;

  try {
    const result = await gloo
      .classifierClientV1()
      .predictInternal(classifierId, {
        input: {
          type: "text",
          value: input,
        },
        override: config,
        llmTarget,
      });

    const response = new Response(JSON.stringify(result), {
      headers: { "content-type": "application/json" },
    });
    return response;
  } catch (e) {
    if (e instanceof Error) {
      return new Response(e.message, { status: 500 });
    } else {
      return new Response("Unknown Error", { status: 500 });
    }
  }
}

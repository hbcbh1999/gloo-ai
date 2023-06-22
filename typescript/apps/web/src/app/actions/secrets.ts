"use server";

import { createGlooClient } from "@gloo/client-internal";
import type { PrismaBase } from "@gloo/database";
import { prisma } from "@gloo/database";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const secretSchema = z.object({
  secretId: z.string(),
  name: z.string(),
  manageApps: z.boolean(),
  readApp: z.string(),
  writeApp: z.string(),
});

const GetOrgSecretsResponse = z.array(secretSchema);
export type GetOrgSecretsResponse = z.infer<typeof GetOrgSecretsResponse>;

const throwEnvError = (env: string) => {
  throw new Error(`Missing environment variable: ${env}`);
};

const glooClient = (orgId: string) => {
  const secretKey =
    process.env.GLOO_AUTH_SECRET ?? throwEnvError("GLOO_AUTH_SECRET");
  const baseUrl =
    process.env.GLOO_SERVICE_URL ?? throwEnvError("GLOO_SERVICE_URL");

  const gloo = createGlooClient({
    secretKey: secretKey,
    baseUrl: baseUrl,
    tag: "GLOO:NEXTJS",
    org: orgId,
  });

  return gloo;
};

export const getOrgSecrets = async (orgId: string) => {
  const gloo = glooClient(orgId);
  const response = await gloo._httpRaw<z.infer<typeof GetOrgSecretsResponse>>(
    "GET",
    "/org/secrets"
  );
  return response;
};

export const deleteSecretKey = async (secretId: string, orgId: string) => {
  const gloo = glooClient(orgId);
  await gloo._httpRaw("DELETE", "/org/secrets", undefined, {
    secretId,
  });
  revalidatePath("/dashboard/api");
};

export const createSecret = async (input: { name: string }, orgId: string) => {
  const gloo = glooClient(orgId);
  const reqBody = {
    name: input.name,
    appScope: "ALL",
  };
  const response = await gloo._httpRaw<{
    secretKey: string;
    secret: z.infer<typeof secretSchema>;
  }>("POST", "/org/secrets", undefined, reqBody);
  revalidatePath("/dashboard/api");
  return response;
};

export const getLLMKeysSafe = async (
  orgId: string
): Promise<
  [
    ...Omit<PrismaBase.LLMEndpoints, "orgId">[],
    Omit<PrismaBase.LLMEndpoints, "orgId">
  ]
> => {
  const res = (
    await prisma.lLMEndpoints.findMany({
      where: {
        orgId,
      },
      select: {
        apiKey: true,
        name: true,
        provider: true,
        apiBaseUrl: true,
      },
    })
  ).map((x) => ({
    ...x,
    apiKey: `${x.apiKey.slice(0, 3)}-....${x.apiKey.slice(-4)}`,
  }));
  const defaultEndpoint: Omit<PrismaBase.LLMEndpoints, "orgId"> = {
    name: "GLOO_DEFAULT_LLM",
    apiKey: "REDACTED",
    provider: "OpenAI",
    apiBaseUrl: "https://api.openai.com/v1",
  };
  return [...res, defaultEndpoint];
};

export const saveLLMKey = async (
  input: Omit<PrismaBase.LLMEndpoints, "orgId">,
  orgId: string
) => {
  if (input.name === "GLOO_DEFAULT_LLM") {
    throw new Error("Cannot create LLM with name GLOO_DEFAULT_LLM");
  }
  await prisma.lLMEndpoints.create({
    data: {
      orgId,
      ...input,
    },
  });
  revalidatePath("/dashboard/api");
};

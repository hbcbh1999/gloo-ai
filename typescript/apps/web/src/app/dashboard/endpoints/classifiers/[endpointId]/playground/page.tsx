"use server";

import { auth as clerkAuth } from "@clerk/nextjs";
import { isRedirectError } from "next/dist/client/components/redirect";

import ConfigPlayground from "./_helpers/playground";

import { getClassifier } from "@/app/actions/classifiers";
import { getLLMKeysSafe } from "@/app/actions/secrets";

export default async function Playground(params: {
  params: { endpointId: string };
}) {
  const auth = clerkAuth();

  if (!auth.orgId) {
    return <div>Page failed to load</div>;
  }
  const llmTargets = await getLLMKeysSafe(auth.orgId);

  try {
    const classifier = await getClassifier(params.params.endpointId);
    return <ConfigPlayground llmTargets={llmTargets} classifier={classifier} />;
  } catch (e) {
    if (isRedirectError(e)) {
      throw e;
    }
    console.log(e);
    return <div>Page failed to load</div>;
  }
}

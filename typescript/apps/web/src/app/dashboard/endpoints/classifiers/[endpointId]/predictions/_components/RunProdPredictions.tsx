"use client";

import { useParams } from "next/navigation";
import { useTransition } from "react";
import { useAuth, useUser } from "@clerk/nextjs";

import { generatePredictionTestData } from "@/app/actions/classifiers";
import { Button } from "@/components/ui/button";

export const RunProdPredictions = () => {
  const params = useParams();
  const isInternalUser = !!useUser().user?.emailAddresses.some((e) =>
    e.emailAddress.endsWith("@gloo.chat")
  );
  const orgId = useAuth().orgId;
  const endpointId = params.endpointId;
  const [isPending, startTransition] = useTransition();

  if (!endpointId || !orgId || !isInternalUser) {
    return null;
  }

  return (
    <Button
      variant="secondary"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await generatePredictionTestData(orgId, endpointId);
        })
      }
    >
      New Prediction (INTERNAL)
    </Button>
  );
};

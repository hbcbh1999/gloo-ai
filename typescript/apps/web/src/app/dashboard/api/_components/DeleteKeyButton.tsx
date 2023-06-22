"use client";

import { useTransition } from "react";

import { deleteSecretKey } from "@/app/actions/secrets";
import { Button } from "@/components/ui/button";

export function DeleteKeyButton({
  secretKeyId,
  orgId,
}: {
  secretKeyId: string;
  orgId: string;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <>
      <Button
        variant="destructive"
        disabled={isPending}
        onClick={() => {
          startTransition(async () => {
            return await deleteSecretKey(secretKeyId, orgId);
          });
        }}
      >
        Delete
      </Button>
    </>
  );
}

"use client";

import { useTransition } from "react";

import { deleteClassifierConfig } from "@/app/actions/classifiers";
import { Button } from "@/components/ui/button";

export const DeleteConfigButton = ({ configId }: { configId: string }) => {
  const [isPending, startTransition] = useTransition();
  return (
    <>
      <Button
        variant={"destructive"}
        disabled={isPending}
        onClick={() => {
          startTransition(async () => {
            await deleteClassifierConfig(configId);
          });
        }}
      >
        Delete
      </Button>
    </>
  );
};

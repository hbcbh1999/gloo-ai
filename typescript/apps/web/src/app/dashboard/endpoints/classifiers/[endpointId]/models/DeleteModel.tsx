"use client";

import { removeTrainedEndpoint } from "@/app/actions/classifiers";
import { Button } from "@/components/ui/button";

const DeleteButton: React.FC<{ modelId: string }> = ({ modelId }) => {
  return (
    <Button
      variant="destructive"
      onClick={() => {
        removeTrainedEndpoint(modelId).catch((err) => {
          console.error(err);
          throw err;
        });
      }}
    >
      Delete
    </Button>
  );
};

export default DeleteButton;

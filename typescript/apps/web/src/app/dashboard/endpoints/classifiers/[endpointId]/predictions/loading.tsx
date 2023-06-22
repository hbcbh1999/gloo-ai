import React from "react";
import { ClipLoader } from "react-spinners";

export default function Loading() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <ClipLoader color="gray" />
    </div>
  );
}

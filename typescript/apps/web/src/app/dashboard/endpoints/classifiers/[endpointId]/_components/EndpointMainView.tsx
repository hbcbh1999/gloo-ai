"use client";

import { Suspense } from "react";

import { TooltipProvider } from "@/components/ui/tooltip";

export const MainViewLayout = ({ children }: { children: React.ReactNode }) => {
  const topBarHeight = 30 + 64;
  return (
    <div
      className="bg-muted/15 relative flex w-full flex-1 flex-col"
      style={{ height: `calc(100vh - ${topBarHeight}px)` }}
    >
      <div className="absolute inset-0 h-full w-full overflow-hidden">
        <div className="h-full w-full" />
      </div>
      <div className="relative flex-1 overflow-auto">
        <Suspense fallback={<div>Page is loading...</div>}>
          <TooltipProvider>{children}</TooltipProvider>
        </Suspense>
      </div>
    </div>
  );
};

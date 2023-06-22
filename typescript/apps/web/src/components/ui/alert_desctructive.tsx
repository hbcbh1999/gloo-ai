import { AlertCircle } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function AlertDestructive({ children }: { children: React.ReactNode }) {
  return (
    <Alert variant="destructive" className="h-fit w-fit">
      <AlertTitle className="flex flex-row items-center gap-x-2">
        <AlertCircle className="h-4 w-4" />
        Error
      </AlertTitle>
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  );
}

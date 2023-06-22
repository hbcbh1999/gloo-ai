import type { ClassNameValue } from "tailwind-merge/dist/lib/tw-join";
import { format } from "date-fns";

export const formatDate = (date: Date) => {
  const formattedDate = format(date, "MMM dd, yyyy h:mm a");

  return formattedDate;
};

export function notEmpty<T>(value: T | null | undefined): value is T {
  if (value === null || value === undefined) return false;
  return true;
}

export type PropsWithClassNames = { className?: ClassNameValue };

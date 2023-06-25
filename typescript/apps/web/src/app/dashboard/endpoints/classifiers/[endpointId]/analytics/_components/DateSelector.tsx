"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const DateSelector = () => {
  const dateOptions = ["7", "14", "30"];

  const router = useRouter();

  const [dateRange, setDateRange] = useState(dateOptions[0]!);

  return (
    <Select
      value={dateRange}
      onValueChange={(e) => {
        setDateRange(e);
        router.push(`?range=${e}`);
        // refresh the page with the new date range
      }}
    >
      <SelectTrigger className="w-fit">
        <SelectValue placeholder={`${dateRange} days`} />
      </SelectTrigger>
      <SelectContent>
        {dateOptions.map((option) => (
          <SelectItem className="whitespace-nowrap" value={option} key={option}>
            {option} days
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

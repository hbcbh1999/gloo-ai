"use client";

import clsx from "clsx";
import Link from "next/link";
import { useSelectedLayoutSegment } from "next/navigation";

import type { Item } from "@/components/ui/custom/tab-group";

export const Tab = ({ path, item }: { path: string; item: Item }) => {
  const segment = useSelectedLayoutSegment();
  const href = item.slug ? path + "/" + item.slug : path;
  // active if the current segment matches the item's segment or slug
  const isActive =
    // Example home pages e.g. `/layouts`
    (!item.slug && segment === null) ||
    segment === item.segment ||
    // Nested pages e.g. `/layouts/electronics`
    segment === item.slug;

  return (
    <Link
      href={href}
      className={clsx(
        "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        {
          "hover:border-b-1 border-b-secondary text-muted-foreground hover:border-secondary hover:bg-secondary hover:text-foreground":
            !isActive,
          "bg-background text-foreground shadow-sm": isActive,
        }
      )}
    >
      {item.text}
    </Link>
  );
};

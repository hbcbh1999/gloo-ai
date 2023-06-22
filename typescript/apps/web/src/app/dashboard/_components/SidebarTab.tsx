"use client";

import { KeyIcon, SignalIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";
import Link from "next/link";
import { usePathname, useSelectedLayoutSegment } from "next/navigation";

import type { Item } from "@/components/ui/custom/tab-group";

interface IconComponentMap {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: React.ComponentType<any>;
}

// define this here since this is a client component and we can't pass icons from
// server to client components :(
const iconComponents: IconComponentMap = {
  Endpoints: SignalIcon,
  Keys: KeyIcon,
};

export const SidebarTab = ({
  path,
  item,
  classNames,
}: {
  classNames?: string;
  path: string;
  item: Item;
}) => {
  const actualPath = usePathname();
  const segment = useSelectedLayoutSegment();
  const href = item.slug ? path + "/" + item.slug : path;
  // active if the current segment matches the item's segment or slug
  const isActive =
    actualPath === href ||
    // Example home pages e.g. `/layouts`
    (!item.slug && segment === null) ||
    segment === item.segment ||
    // Nested pages e.g. `/layouts/electronics`
    segment === item.slug;

  const IconComponent = iconComponents[item.text];
  return (
    <Link
      href={href}
      className={clsx([
        "rounded-md",
        isActive ? "bg-secondary" : "hover:bg-secondary/50",
        classNames
          ? classNames
          : "flex gap-x-3 text-sm font-semibold leading-6 text-foreground/80",
      ])}
    >
      <div className="flex items-center gap-x-2">
        {IconComponent && (
          <IconComponent
            className="h-5 w-5 shrink-0 text-foreground/50"
            aria-hidden="true"
          />
        )}
        <div className="truncate">{item.text}</div>
      </div>
    </Link>
  );
};

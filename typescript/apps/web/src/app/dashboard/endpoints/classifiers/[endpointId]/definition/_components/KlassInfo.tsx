"use client";
import type { PropsWithChildren } from "react";
import { useState } from "react";
import clsx from "clsx";
import { CircleSlash, Ghost } from "lucide-react";

import type {
  ClientKlass,
  ClientKlassVersion,
} from "@/app/actions/classifiers";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { VersionString } from "@/app/_utils/shared";

function hashCode(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash;
}

export function getKlassColor(id: string) {
  const colorIndex = Math.abs(hashCode(id)) % 20; // 20 colors in tailwind.config.js
  return `klass-${colorIndex}`;
}

export const KlassInfoSimple: React.FC<
  PropsWithChildren & {
    name: string;
    id: string;
    isLatestVersion: boolean;
    version: number;
    description: string;
    supressed?: boolean;
    hallucinated?: boolean;
  }
> = ({
  id,
  version,
  name,
  isLatestVersion,
  description,
  children,
  supressed,
  hallucinated,
}) => {
  const color = getKlassColor(id);

  return (
    <div className="flex flex-col items-center p-2">
      {supressed && (
        <div className="mb-2 flex w-fit flex-row items-start gap-1 rounded-md bg-yellow-200 p-2 text-yellow-600">
          <CircleSlash className="h-4 w-4" />
          <span className="w-60 whitespace-break-spaces text-xs">
            <b>Suppressed</b> If the model selects this class, then we will
            filter it out of the output.
          </span>
        </div>
      )}
      {hallucinated && (
        <div className="mb-2 flex w-fit flex-row items-start gap-1 rounded-md bg-red-200 p-2 text-red-600">
          <Ghost className="h-4 w-4" />
          <span className="w-60 whitespace-break-spaces text-xs">
            <b>Hallucinated</b> This class was made up by the LLM.
          </span>
        </div>
      )}
      {hallucinated ? (
        <div className="flex w-full flex-row items-end justify-between gap-x-4 text-base font-semibold">
          <div className="flex flex-col">
            <div className="flex flex-row items-center gap-x-2">
              <div className="text-base">{name}</div>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="flex w-full flex-row items-end justify-between gap-x-4 text-base font-semibold">
            <div className="flex flex-col">
              <div className="w-48 truncate text-xs font-light text-muted-foreground/50">
                {id}
              </div>
              <div className="flex flex-row items-center gap-x-2">
                <div className={clsx("h-4 w-4 rounded-full", `bg-${color}`)} />
                <div className="text-base">{name}</div>
              </div>
            </div>
            {children ?? (
              <div className="flex flex-col">
                {isLatestVersion && (
                  <span className="text-xs font-light">Latest</span>
                )}
                <VersionString version={version} />
              </div>
            )}
          </div>
          <div className="w-72 whitespace-pre-wrap text-sm">{description}</div>
        </>
      )}
    </div>
  );
};

export default function KlassInfo({
  klass,
  defaultVersionIndex,
}: {
  klass: ClientKlass;
  defaultVersionIndex?: number;
}) {
  const versions = klass.versions ?? [];
  const actualIndex = defaultVersionIndex ?? versions.length - 1;
  const [selectedVersion, setSelectedVersion] = useState(() => {
    if (versions.length === 0) {
      return undefined;
    }
    return versions[actualIndex];
  });

  if (!selectedVersion) {
    return <>No version found!</>;
  }

  const color = getKlassColor(klass.id);
  if (!color) {
    return <>No color found!</>;
  }

  return (
    <KlassInfoSimple
      name={selectedVersion.name}
      id={klass.id}
      description={selectedVersion.description}
      version={selectedVersion.versionId}
      isLatestVersion={
        !versions.find((i) => i.versionId > selectedVersion.versionId)
      }
    >
      <KlassVersionDropdown
        currVersion={selectedVersion}
        versions={klass.versions ?? []}
        variant="small"
        onSelect={(version) => {
          setSelectedVersion(version);
        }}
      />
    </KlassInfoSimple>
  );
}

type DropdownVariantType = "full" | "small";
const convertVersionToString = (
  version: ClientKlassVersion,
  variant: DropdownVariantType
) => {
  if (variant === "small") {
    return <VersionString version={version.versionId} />;
  }
  return (
    <span className="flex flex-row gap-2">
      {version.name} <VersionString version={version.versionId} />
    </span>
  );
};

export const KlassVersionDropdown = ({
  currVersion,
  versions,
  onSelect,
  variant,
}: {
  versions: ClientKlassVersion[];
  currVersion: ClientKlassVersion;
  onSelect: (version: ClientKlassVersion) => void;
  variant: DropdownVariantType;
}) => {
  return (
    <>
      <Select
        value={currVersion.versionId.toString()}
        onValueChange={(e) => {
          const version = versions.find(
            (version) => version.versionId.toString() === e
          );
          if (version) {
            onSelect(version);
          }
        }}
      >
        <SelectTrigger
          className={clsx("whitespace-nowrap", [
            variant === "small" ? "w-20" : "w-40",
          ])}
        >
          <SelectValue
            placeholder={convertVersionToString(currVersion, variant)}
          />
        </SelectTrigger>
        <SelectContent>
          {versions
            .map((version, index) => (
              <SelectItem
                className="whitespace-nowrap"
                value={version.versionId.toString()}
                key={index}
              >
                {convertVersionToString(version, variant)}
              </SelectItem>
            ))
            .reverse()}
        </SelectContent>
      </Select>
    </>
  );
};

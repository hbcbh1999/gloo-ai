"use client";
import { useState, useMemo } from "react";
import { Select, SelectItem } from "@tremor/react";

import type { getClassifier } from "@/app/actions/classifiers";

const VersionPicker: React.FC<{
  versions: Awaited<ReturnType<typeof getClassifier>>["klasses"][0]["versions"];
  versionIndex: number;
  setVersionIndex: React.Dispatch<React.SetStateAction<number>>;
}> = ({ versions, versionIndex, setVersionIndex }) => {
  if (versions.length === 0) {
    return null;
  }

  return (
    <Select
      onValueChange={(value) => setVersionIndex(parseInt(value))}
      value={`${versionIndex}`}
      className="w-16"
    >
      {versions.map((version, index) => (
        <SelectItem key={version.versionId} value={`${index}`}>
          {`${version.name} [Rev ${version.versionId}]`}
        </SelectItem>
      ))}
    </Select>
  );
};

export default function KlassRender({
  klass,
  index,
}: {
  klass: Awaited<ReturnType<typeof getClassifier>>["klasses"][0];
  index: number;
}) {
  const [versionIndex, setVersionIndex] = useState(0);

  const version = useMemo(
    () => klass.versions[versionIndex],
    [klass, versionIndex]
  );

  if (!version) {
    return null;
  }

  return (
    <div className="flex flex-col py-2 pr-4">
      <div className="flex items-center gap-2">
        <div className={`bg-klass-${index % 20} h-4 w-4 rounded-full`} />
        <VersionPicker
          versionIndex={versionIndex}
          versions={klass.versions}
          setVersionIndex={setVersionIndex}
        />
      </div>
      <pre className="px-6">{version.description}</pre>
    </div>
  );
}

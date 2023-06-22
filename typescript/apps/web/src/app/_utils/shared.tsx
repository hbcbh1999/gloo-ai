import { GitCommit } from "lucide-react";

export const VersionString: React.FC<{ version: number | string }> = ({
  version,
}) => (
  <span className="flex flex-row items-center font-normal">
    <GitCommit className="-mr-1 h-4 w-4 rotate-90 stroke-1" />
    {version === -2 ? "Edited" : `v${version}`}
  </span>
);

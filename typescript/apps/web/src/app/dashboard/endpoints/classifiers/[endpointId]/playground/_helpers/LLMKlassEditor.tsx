import React, { useMemo } from "react";
import { useRecoilValue } from "recoil";
import { CircleSlash, Delete, PlusCircle, Settings } from "lucide-react";
import type { KlassDetails } from "@gloo/client-internal";

import { KlassBadge } from "../../_components/PipelineView";

import type { ClientKlassDetails } from "./atoms";
import {
  klassItemsMapAtom,
  llmPredictorEditorAtom,
  useKlassAtom,
} from "./atoms";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { VersionString } from "@/app/_utils/shared";

const KlassRow: React.FC<{
  klass: ClientKlassDetails;
  versions: Map<number, KlassDetails & { isLocal: boolean }>;
}> = ({ klass, versions }) => {
  const { llmKlassSettings } = useKlassAtom();

  const onChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    if (name === "name") {
      llmKlassSettings(klass.id, klass.version, {
        name: value,
      }).catch((e) => {
        console.log(e);
      });
    } else if (name === "description") {
      llmKlassSettings(klass.id, klass.version, {
        description: value,
      }).catch((e) => {
        console.log(e);
      });
    }
  };

  return (
    <div className="flex flex-row items-start gap-1">
      <div className="flex flex-col gap-1">
        <div className="flex flex-row items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-fit w-fit p-1">
                <Settings className="h-4 w-4 stroke-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56">
              <DropdownMenuItem className="gap-1 text-yellow-600">
                <CircleSlash className="h-4 w-4 stroke-1" />
                <span>Supress (Coming soon!)</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="gap-1 text-red-800"
                onClick={() => {
                  llmKlassSettings(klass.id, klass.version, {
                    active: false,
                  }).catch((e) => {
                    console.log(e);
                    throw e;
                  });
                }}
              >
                <Delete className="h-4 w-4 stroke-1" />
                <span>Unselect</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuLabel>Revert to...</DropdownMenuLabel>
                {Array.from(versions.entries())
                  .sort((a, b) => a[0] - b[0])
                  .map(([version, k]) => {
                    if (version === klass.version) return null;
                    return (
                      <DropdownMenuItem
                        key={version}
                        className="flex flex-row items-end gap-1"
                        onClick={() => {
                          llmKlassSettings(klass.id, k.version, {
                            active: true,
                          }).catch((e) => {
                            console.log(e);
                            throw e;
                          });
                        }}
                      >
                        <VersionString version={version} /> {k.name}{" "}
                        <span className="truncate text-xs text-foreground/50">
                          {k.description}
                        </span>
                      </DropdownMenuItem>
                    );
                  })}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <Input
            type="text"
            name="name"
            value={klass.name}
            onChange={onChange}
            className="w-48"
          />
        </div>
        <div className="flex flex-row gap-1 text-xs">
          <VersionString version={klass.version} />
        </div>
      </div>
      <Textarea
        name="description"
        value={klass.description}
        onChange={onChange}
      />
    </div>
  );
};

const KlassEditor: React.FC = () => {
  const klasses = useRecoilValue(klassItemsMapAtom);
  const llmKlasses = useRecoilValue(llmPredictorEditorAtom)?.klasses;
  const { createKlass, llmKlassSettings } = useKlassAtom();

  const { selected, available } = useMemo(() => {
    const selected: { data: ClientKlassDetails; index: number }[] = [];
    const available: [string, Map<number, KlassDetails>][] = [];
    for (const [klass, entry] of klasses.entries()) {
      const idx = llmKlasses?.available.findIndex((k) => k.id === klass) ?? -1;
      if (idx >= 0 && llmKlasses?.available) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const match = llmKlasses.available.at(idx);
        if (!match) continue;

        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        const matchedVersion = entry.get(match.version);
        if (matchedVersion) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          selected.push({ data: matchedVersion, index: idx });
          continue;
        }
      }
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      available.push([klass, entry]);
    }
    return {
      selected: selected.sort((a, b) => a.index - b.index).map((a) => a.data),
      available,
    };
  }, [klasses, llmKlasses]);

  return (
    <div className="flex flex-col gap-y-2 rounded-md border border-border px-4 py-2">
      <div className="flex flex-col gap-y-2 rounded-md bg-muted p-4">
        <div className="text-sm">
          <b>Unselected Classes</b> ({available.length})
        </div>
        <div className="flex max-h-20 flex-wrap gap-2 overflow-y-auto">
          <Badge
            variant="outline"
            className="gap-1 hover:cursor-pointer hover:bg-muted-foreground/50"
            onClick={() => createKlass()}
          >
            <PlusCircle className="h-4 w-4 stroke-1" /> Create
          </Badge>
          {available.map(([id, entry]) => {
            const latestVersion = Math.max(...Array.from(entry.keys()));
            const version = entry.has(-2) ? -2 : latestVersion;
            const val = entry.get(version);
            if (!val) return null;
            return (
              <div
                className="h-fit w-fit"
                key={id}
                onClick={() => {
                  llmKlassSettings(id, version, {
                    active: true,
                  }).catch((e) => {
                    console.log(e);
                    throw e;
                  });
                }}
              >
                <KlassBadge
                  {...val}
                  isLatestVersion={version === latestVersion}
                  className="opacity-40 hover:opacity-90"
                />
              </div>
            );
          })}
        </div>
      </div>
      <div className="flex flex-col gap-y-2 rounded-md p-4">
        <div className="text-sm">
          <b>Selected Classes</b> ({selected.length})
        </div>
        {selected.map((klass) => {
          const entry = klasses.get(klass.id);
          if (!entry) return null;

          return <KlassRow key={klass.id} klass={klass} versions={entry} />;
        })}
      </div>
    </div>
  );
};

export default KlassEditor;

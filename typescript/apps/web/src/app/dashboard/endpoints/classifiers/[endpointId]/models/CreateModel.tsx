"use client";

import type { PropsWithChildren } from "react";
import { useMemo } from "react";
import { useState } from "react";
import type { Types } from "@gloo/database";
import { MinusCircle, PlusCircle } from "lucide-react";

import { KlassBadge } from "../_components/PipelineView";
import type { ClientKlassDetails } from "../playground/_helpers/atoms";

import { Input } from "@/components/ui/input";
import type { availableTrainedEndpoints } from "@/app/actions/classifiers";
import { createTrainedEndpoint } from "@/app/actions/classifiers";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { notEmpty } from "@/app/_utils/utils";

const KlassItem: React.FC<
  { klass: ClientKlassDetails; onClick: () => void } & PropsWithChildren
> = ({ klass, onClick, children }) => {
  return (
    <>
      <Button variant="ghost" className="p-1" onClick={onClick}>
        {children}
      </Button>
      <KlassBadge
        id={klass.id}
        name={klass.name}
        description={klass.description}
        version={klass.version}
        isLatestVersion={true}
        noTooltip
      />
    </>
  );
};

const KlassList: React.FC<{
  klasses: ClientKlassDetails[];
  onClick: (id: string) => void;
}> = ({ klasses, onClick }) => {
  return (
    <>
      {klasses.map((klass) => (
        <div className="flex flex-row items-center" key={klass.id}>
          <KlassItem klass={klass} onClick={() => onClick(klass.id)}>
            <MinusCircle className="h-4 w-4 stroke-1" />
          </KlassItem>
        </div>
      ))}
    </>
  );
};

const CreateModel: React.FC<{
  classifierId: string;
  klasses: Awaited<ReturnType<typeof availableTrainedEndpoints>>["klasses"];
}> = ({ classifierId, klasses }) => {
  const [search, setSearch] = useState("");
  const [modelId, setModelId] = useState("");
  const [supportedKlasses, setSupportedKlasses] =
    useState<Types.SupportedKlasses>([]);

  const klassDetails = useMemo(() => {
    return klasses
      .map((klass) => {
        const rev = klass.versions.at(0);
        if (!rev) return null;
        return {
          id: klass.id,
          version: rev.versionId,
          name: rev.name,
          description: rev.description,
          isLocal: false,
        };
      })
      .filter(notEmpty);
  }, [klasses]);

  async function addItem() {
    if (modelId.length < 5 || supportedKlasses.length < 1) return;
    await createTrainedEndpoint(classifierId, modelId, supportedKlasses);
  }

  return (
    <div className="flex w-fit flex-col">
      <Card>
        <CardHeader>
          <CardTitle>Add a model</CardTitle>
        </CardHeader>
        <CardContent>
          <label className="block">
            <span className="font-medium text-foreground/80">Model Id</span>
            <Input
              type="text"
              placeholder="0000-0000-0000-0000"
              className="w-72"
              value={modelId}
              onChange={(e) => {
                setModelId(e.target.value);
              }}
            />
          </label>
          <div className="grid grid-cols-2">
            <div className="flex grow flex-col">
              <Input
                type="text"
                placeholder="Search"
                className="w-full"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                }}
              />
              {klasses.map((klass) => {
                const rev = klass.versions.at(0);
                if (!rev) return null;
                const available = !!supportedKlasses.find(
                  (k) => k.id === klass.id
                );
                if (available) return null;
                if (
                  search.length > 0 &&
                  !rev.name.toLowerCase().includes(search.toLowerCase())
                )
                  return null;

                return (
                  <div className="flex flex-row items-center" key={klass.id}>
                    <KlassItem
                      klass={{
                        id: klass.id,
                        version: rev.versionId,
                        name: rev.name,
                        description: rev.description,
                        isLocal: false,
                      }}
                      onClick={() => {
                        setSupportedKlasses((p) => [
                          ...p,
                          {
                            id: klass.id,
                            version: rev.versionId,
                          },
                        ]);
                      }}
                    >
                      <PlusCircle className="h-4 w-4 stroke-1" />
                    </KlassItem>
                  </div>
                );
              })}
            </div>
            <div className="flex  grow flex-col gap-2">
              <div className="flex flex-col gap-1">
                <KlassList
                  onClick={(id: string) => {
                    setSupportedKlasses((p) => p.filter((k) => k.id !== id));
                  }}
                  klasses={supportedKlasses
                    .map((s) =>
                      klassDetails.find(
                        (k) => k.id === s.id && k.version === s.version
                      )
                    )
                    .filter(notEmpty)}
                />
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button
            onClick={() => {
              addItem().catch(console.error);
            }}
            disabled={modelId.length < 5 || supportedKlasses.length < 1}
          >
            Add
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default CreateModel;

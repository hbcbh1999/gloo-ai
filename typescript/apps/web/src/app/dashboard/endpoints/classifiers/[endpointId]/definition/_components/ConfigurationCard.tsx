"use client";

import { StarIcon as StarOutlineIcon } from "@heroicons/react/24/outline";
import { PencilIcon, StarIcon } from "@heroicons/react/24/solid";
import Link from "next/link";
import React, { useMemo, useState, useTransition } from "react";
import { ClipLoader } from "react-spinners";

import { VersionView } from "./VersionView";

import { VersionString } from "@/app/_utils/shared";
import { formatDate } from "@/app/_utils/utils";
import type {
  ClientClassifier,
  ClientClassifierConfig,
  ClientClassifierConfigVersion,
  ClientKlass,
  getClassifier,
} from "@/app/actions/classifiers";
import { makeDefaultConfig } from "@/app/actions/classifiers";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export const ConfigurationCard: React.FC<{
  classifier: ClientClassifier;
  config: ClientClassifierConfig;
  isDefault: boolean;
  klasses: ClientKlass[];
}> = ({ classifier, config, isDefault, klasses }) => {
  const [versionIndex, setVersionIndex] = useState(config.versions.length - 1);

  const version = useMemo(
    () => config.versions[versionIndex],
    [config, versionIndex]
  );

  const [isPending, startTransition] = useTransition();

  return (
    <Card className="h-fit drop-shadow-md">
      <CardHeader>
        <div className="flex items-center gap-2">
          {version && (
            <Tooltip delayDuration={100}>
              <TooltipTrigger>
                <Link
                  href={`/dashboard/endpoints/classifiers/${config.classifierId}/playground?configId=${config.id}&version=${version.versionId}`}
                >
                  <Button className="px-1 py-0" variant="ghost">
                    <PencilIcon className="h-5 w-5" />
                  </Button>
                </Link>
              </TooltipTrigger>
              <TooltipContent>{"Open in playground"}</TooltipContent>
            </Tooltip>
          )}
          <CardTitle className="whitespace-nowrap">{config.name}</CardTitle>

          <div className="ml-auto w-32 truncate text-sm font-light text-muted-foreground/60">
            {config.id}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <VersionPicker
            versions={config.versions}
            versionIndex={versionIndex}
            setVersionIndex={setVersionIndex}
          />
          {isDefault ? (
            <Tooltip delayDuration={100}>
              <TooltipTrigger>
                <StarIcon className="w-5 text-yellow-400" />
              </TooltipTrigger>
              <TooltipContent>
                When you call this classifier without specifying a config, this
                is the config version that will be used
              </TooltipContent>
            </Tooltip>
          ) : (
            <Tooltip delayDuration={100}>
              <TooltipTrigger>
                <Button
                  disabled={isPending}
                  className="whitespace-nowrap"
                  variant={"outline"}
                  onClick={() => {
                    const version = config.versions[versionIndex];

                    if (!version) return;
                    startTransition(async () => {
                      await makeDefaultConfig(
                        classifier.id,
                        config.id,
                        version.versionId
                      );
                    });
                  }}
                >
                  <div>
                    {isPending ? (
                      <ClipLoader size={16} color="grey" />
                    ) : (
                      <StarOutlineIcon className="w-6 text-yellow-400" />
                    )}
                  </div>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Make Default</TooltipContent>
            </Tooltip>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {version && (
          <VersionView
            classifier={classifier}
            version={version}
            klasses={klasses}
          />
        )}
      </CardContent>
    </Card>
  );
};

const versionStringComponent = (version: ClientClassifierConfigVersion) => {
  return (
    <div className="flex flex-row items-center gap-x-2">
      <div className="text-base font-semibold">
        <VersionString version={version.versionId} />
      </div>
      <div className="font-light text-muted-foreground/60">
        {formatDate(version.createdAt)}
      </div>
    </div>
  );
};

const VersionPicker: React.FC<{
  versions: Awaited<
    ReturnType<typeof getClassifier>
  >["classifierConfig"][0]["versions"];
  versionIndex: number;
  setVersionIndex: React.Dispatch<React.SetStateAction<number>>;
}> = ({ versions, versionIndex, setVersionIndex }) => {
  if (versions.length === 0) {
    return null;
  }

  const currVersion = versions[versionIndex];
  if (!currVersion) {
    setVersionIndex(versions.length - 1);
    return null;
  }

  return (
    <Select
      onValueChange={(value) => setVersionIndex(parseInt(value))}
      value={`${versionIndex}`}
    >
      <SelectTrigger>
        <SelectValue>{versionStringComponent(currVersion)}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {versions.map((version, index) => (
          <SelectItem key={version.versionId} value={`${index}`}>
            {versionStringComponent(version)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

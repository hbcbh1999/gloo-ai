"use client";

import { useRouter } from "next/navigation";
import type { PropsWithChildren } from "react";
import { useState, useTransition } from "react";
import { useRecoilValue } from "recoil";
import { isRedirectError } from "next/dist/client/components/redirect";

import PipelineView from "../../_components/PipelineView";

import {
  classifierAtom,
  loadedConfigAtom,
  pipelineViewAtom,
  selectedConfigId,
} from "./atoms";

import { VersionString } from "@/app/_utils/shared";
import { formatDate } from "@/app/_utils/utils";
import {
  createClassifierConfig,
  createClassifierConfigVersion,
  makeDefaultConfig,
} from "@/app/actions/classifiers";
import { AlertDestructive } from "@/components/ui/alert_desctructive";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";

const SaveButton = ({
  isDefault,
  setError,
  disabled,
  name,
}: {
  isDefault: boolean;
  disabled: boolean;
  name: string;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
}) => {
  const [isPending, startTransition] = useTransition();
  const selection = useRecoilValue(selectedConfigId);
  const classifierId = useRecoilValue(classifierAtom)?.id;
  const { normalizer, ftPredictor, llmPredictor, klasses } =
    useRecoilValue(pipelineViewAtom);

  const router = useRouter();

  if (!classifierId) return null;

  return (
    <Button
      disabled={isPending || disabled}
      onClick={() =>
        startTransition(async () => {
          let versionInfo: {
            configId: string;
            versionId: number;
          } | null = null;
          try {
            if (selection) {
              const res = await createClassifierConfigVersion(
                classifierId,
                selection.id,
                normalizer,
                llmPredictor,
                ftPredictor,
                klasses.filter((k) => k.isLocal)
              );
              versionInfo = {
                configId: res.configId,
                versionId: res.versionId,
              };
            } else {
              const res = await createClassifierConfig(
                classifierId,
                name,
                normalizer,
                llmPredictor,
                ftPredictor,
                klasses.filter((k) => k.isLocal)
              );
              versionInfo = {
                configId: res.configId,
                versionId: res.versionId,
              };
            }
            if (isDefault) {
              await makeDefaultConfig(
                classifierId,
                versionInfo.configId,
                versionInfo.versionId
              );
            }
            router.push(
              `/dashboard/endpoints/classifiers/${classifierId}/definition`
            );
          } catch (e) {
            if (isRedirectError(e)) {
              throw e;
            }
            if (e instanceof Error) {
              setError(e.message);
            }
          }
        })
      }
    >
      {selection ? "Commit" : "Save"}
      {selection && <VersionString version={"Latest"} />}
    </Button>
  );
};

const CurrentPipelineView: React.FC = () => {
  const { normalizer, ftPredictor, llmPredictor, klasses } =
    useRecoilValue(pipelineViewAtom);

  return (
    <div className="flex flex-col items-center gap-2">
      <VersionString version={"Latest"} />
      <PipelineView
        normalizer={normalizer}
        ftPredictor={ftPredictor}
        llmPredictor={llmPredictor}
        klasses={klasses}
      />
    </div>
  );
};

const PreviousPipelineView: React.FC<{
  configId: string;
  version: number;
}> = ({ configId, version }) => {
  const content = useRecoilValue(loadedConfigAtom({ configId, version }));
  if (!content) return null;

  return (
    <>
      <div className="flex flex-col items-center gap-2">
        <VersionString version={version} />
        <PipelineView
          normalizer={content.normalizer}
          ftPredictor={content.ftPredictor}
          llmPredictor={content.llmPredictor}
          klasses={content.klasses.flatMap((k) =>
            k.versions.map((r) => ({
              id: k.id,
              version: r.versionId,
              name: r.name,
              description: r.description,
              isLocal: false,
            }))
          )}
        />
      </div>
      <Separator orientation="vertical" />
    </>
  );
};

const SaveDialog: React.FC<PropsWithChildren> = ({ children }) => {
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  const selection = useRecoilValue(selectedConfigId);
  const [isDefault, setIsDefault] = useState(false);
  const [name, setName] = useState("my-config");

  const regex = /^[a-zA-Z0-9-_]+$/;
  const isInputInvalid = !selection && (name.length === 0 || !regex.test(name));

  return (
    <Dialog onOpenChange={setShowModal} open={showModal} modal>
      <DialogTrigger asChild>
        <Button
          className="w-fit px-8"
          // eslint-disable-next-line @typescript-eslint/no-misused-promises
          onClick={() => setShowModal(true)}
          variant="default"
        >
          {children}
        </Button>
      </DialogTrigger>
      <DialogContent className="flex h-fit max-h-[80%] w-fit flex-col items-center  sm:max-w-none">
        <DialogHeader>
          <DialogTitle>Save Configuration</DialogTitle>
          <DialogDescription>
            {selection
              ? "Updating configuration"
              : "Creating a new configuration"}
          </DialogDescription>
        </DialogHeader>
        {!selection && (
          <div className="flex flex-row items-center gap-x-2">
            <div className="text-sm font-bold">Name</div>
            <Input
              value={name}
              onChange={(e) => {
                const value = e.target.value;
                setName(value);
              }}
            />
          </div>
        )}

        <div className="flex w-fit flex-row justify-center gap-6 overflow-y-auto ">
          {selection && (
            <PreviousPipelineView
              configId={selection.id}
              version={selection.version}
            />
          )}
          <CurrentPipelineView />
        </div>
        <Card className="w-fit bg-muted/60">
          <CardHeader className="pb-4">
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
          </CardHeader>
          <CardContent className="flex w-fit flex-row items-center gap-x-4">
            <div className="flex flex-row items-center gap-x-2">
              <Checkbox
                className="bg-background"
                checked={isDefault}
                onCheckedChange={(checked) => {
                  setIsDefault(checked as boolean);
                  return !checked;
                }}
              />
              <div>Make default</div>
            </div>
            <div className="w-96 whitespace-break-spaces text-xs font-normal text-muted-foreground">
              If enabled, this configuration version will be used as the new
              default. All API calls for this classifier will immediately start
              using this configuration wherever &quot;default&quot; is
              specified.
            </div>
          </CardContent>
        </Card>
        <div className="flex flex-col items-center justify-center gap-2">
          <SaveButton
            disabled={isInputInvalid}
            isDefault={isDefault}
            setError={setError}
            name={name}
          />
          {error && <AlertDestructive>{error}</AlertDestructive>}
          {isInputInvalid && (
            <AlertDestructive>
              Name must only contain letters and numbers
            </AlertDestructive>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default function ConfigTopBar() {
  const selection = useRecoilValue(selectedConfigId);

  return (
    <div className="flex w-full flex-row items-center justify-between gap-x-2 p-4 px-8">
      {selection ? (
        <ExistingConfigHeader
          configId={selection.id}
          version={selection.version}
        />
      ) : (
        <div className="flex flex-col">
          <div className="text-lg font-semibold text-foreground">
            New configuration
          </div>
          <div className="text-sm font-light text-muted-foreground">
            Define a classifier pipeline with different transformation or
            prediction steps
          </div>
        </div>
      )}

      <SaveDialog>{selection ? "Preview Changes" : "Save as new"}</SaveDialog>
    </div>
  );
}

const ExistingConfigHeader: React.FC<{
  configId: string;
  version: number;
}> = ({ configId, version }) => {
  const original = useRecoilValue(loadedConfigAtom({ configId, version }));

  if (!original) return null;

  const { config, version: rev } = original;

  return (
    <div className="flex flex-col gap-y-1">
      <div className="flex items-center gap-2 text-lg text-foreground">
        <div className="flex flex-row items-center gap-x-2">
          <span>
            Editing <b>{config.name}</b>
          </span>
          <div className="text-xs font-light text-muted-foreground/50">
            {config.id}
          </div>
        </div>
      </div>
      <div className="flex flex-row gap-x-2">
        <div className="flex flex-row items-center gap-x-2">
          <div className="text-base font-bold">
            <VersionString version={rev.versionId} />
          </div>
          <div className="text-xs font-light text-muted-foreground/60">
            {formatDate(rev.createdAt)}
          </div>
        </div>
      </div>
    </div>
  );
};

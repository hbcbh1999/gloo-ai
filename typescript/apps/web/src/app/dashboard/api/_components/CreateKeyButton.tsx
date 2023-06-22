"use client";

import { Check } from "lucide-react";
import { useEffect, useState, useTransition } from "react";

import { createSecret } from "@/app/actions/secrets";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export function CreateKeyButton({ orgId }: { orgId: string }) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <Dialog onOpenChange={setShowModal} open={showModal}>
        <DialogTrigger asChild>
          <Button
            className="w-fit px-8"
            // eslint-disable-next-line @typescript-eslint/no-misused-promises
            onClick={() => setShowModal(true)}
          >
            Create API Key
          </Button>
        </DialogTrigger>
        <CreateApiKeyModal
          openModal={showModal}
          setModal={setShowModal}
          orgId={orgId}
        />
      </Dialog>
    </>
  );
}

const CreateApiKeyModal: React.FC<{
  openModal: boolean;
  orgId: string;
  setModal: (open: boolean) => void;
}> = ({ openModal, setModal, orgId }) => {
  const [secretName, setSecretName] = useState<string>("Default");
  const [actualSecret, setActualSecret] = useState<string | undefined>();
  const [isPending, startTransition] = useTransition();
  useEffect(() => {
    if (!openModal) {
      setActualSecret(undefined);
      setSecretName("Default");
    }
  }, [openModal]);

  return (
    <DialogContent className="relative w-fit min-w-[25%] transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-fit sm:max-w-[80%] sm:p-6">
      {actualSecret ? (
        <ShowAPIKey setModal={setModal} secretKey={actualSecret} />
      ) : (
        <>
          <div>
            <div className="mt-3 text-center sm:mt-5">
              <DialogTitle className="text-base font-semibold leading-6 text-gray-900">
                Create Secret
              </DialogTitle>
              <div className="mt-2 flex flex-col gap-2">
                <div className="text-left text-xs font-semibold">
                  Secret name
                </div>
                <Input
                  placeholder="Secret name"
                  value={secretName}
                  onChange={(e) => setSecretName(e.target.value)}
                />
              </div>
            </div>
          </div>
          <div className="mx-auto mt-5 max-w-fit sm:mt-6">
            <Button
              disabled={isPending}
              onClick={() => {
                startTransition(async () => {
                  const res = await createSecret(
                    {
                      name: secretName,
                    },
                    orgId
                  );
                  setActualSecret(res.secretKey);
                });
              }}
            >
              Create Secret
            </Button>
          </div>
        </>
      )}
    </DialogContent>
  );
};

function ShowAPIKey({
  secretKey,
  setModal,
}: {
  secretKey: string;
  setModal: (open: boolean) => void;
}) {
  return (
    <>
      <div>
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
          <Check className="h-6 w-6 text-green-600" aria-hidden="true" />
        </div>
        <div className="mt-3 text-center sm:mt-5">
          <DialogTitle className="text-base font-semibold leading-6 text-gray-900">
            API Key Created
          </DialogTitle>
          <div className="mt-2">
            <p className="text-sm text-gray-500">
              Store your secret key in a safe location. You will not be able to
              see the secret key after this dialogue is closed.
            </p>
            <div className="flex flex-col gap-y-4 py-2">
              <div className="flex flex-col gap-y-1">
                <div className="font-bold text-gray-800">Secret Key</div>
                <div className="overflow-x-clip truncate whitespace-pre rounded-full bg-gray-100 px-2 py-1 font-mono text-red-500">
                  {secretKey}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="mx-auto mt-5 max-w-fit sm:mt-6">
        <button
          type="button"
          className="inline-flex w-full justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:text-sm"
          onClick={() => setModal(false)}
        >
          Go back to dashboard
        </button>
      </div>
    </>
  );
}

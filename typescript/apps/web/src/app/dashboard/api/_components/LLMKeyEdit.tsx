"use client";

import { useClerk } from "@clerk/nextjs";
import { useState, useTransition } from "react";
import type { PrismaBase } from "@gloo/database";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { saveLLMKey } from "@/app/actions/secrets";

const OpenAIBaseUrl = "https://api.openai.com/v1";

const testOpenAi = async (key: string) => {
  const requestOptions: RequestInit = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: "text-davinci-003",
      prompt: "Correct this to standard English:\n\nShe no went to the market.",
      temperature: 0,
      max_tokens: 60,
      top_p: 1.0,
      frequency_penalty: 0.0,
      presence_penalty: 0.0,
    }),
  };

  return await fetch(`${OpenAIBaseUrl}/completions`, requestOptions)
    .then((response) => ({ data: response.json(), status: response.status }))
    .then(({ data, status }) => {
      // Handle the API response here
      console.log(data);
      return status === 200;
    })
    .catch((error) => {
      // Handle any errors that occurred during the request
      console.error(error);
      return false;
    });
};

const TestOpenAIKey: React.FC<{ openaiKey: string }> = ({ openaiKey }) => {
  const [status, setStatus] = useState<
    "unset" | "passed" | "failed" | "running"
  >("unset");

  return (
    <div className="flex flex-row gap-2">
      {status === "failed" && (
        <div className="flex flex-row items-center gap-2">
          <span className="text-red-500">✗</span>
          <span>Key is invalid</span>
        </div>
      )}
      {status === "passed" && (
        <div className="flex flex-row items-center gap-2">
          <span className="text-green-500">✓</span>
          <span>Key is valid</span>
        </div>
      )}
      <Button
        variant="outline"
        disabled={status === "running"}
        onClick={() => {
          setStatus("running");
          testOpenAi(openaiKey)
            .then((passed) => {
              setStatus(passed ? "passed" : "failed");
            })
            .catch(() => {
              setStatus("failed");
            });
        }}
      >
        {status === "running" ? "Testing..." : `Test`}
      </Button>
    </div>
  );
};

const SaveKey: React.FC<{
  name: string;
  orgId: string;
  provider: PrismaBase.LLMProvider;
  apiKey: string;
  apiBaseUrl: string;
}> = ({ name, apiKey, orgId, provider, apiBaseUrl }) => {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      disabled={isPending}
      onClick={() => {
        startTransition(() => {
          void saveLLMKey({ name, apiKey, provider, apiBaseUrl }, orgId);
        });
      }}
    >
      Save
    </Button>
  );
};

const LLMKeyDialog: React.FC<{ orgId: string }> = ({ orgId }) => {
  const org = useClerk().organization?.id;
  const [key, setKey] = useState("");
  const [name, setName] = useState("OpenAIKeyName");

  if (!org) return <p>Please select an org first.</p>;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Add</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add LLM Provider Key</DialogTitle>
        </DialogHeader>
        <Input
          value={name}
          placeholder="Key Name"
          onChange={(e) => {
            setName(e.target.value);
          }}
        />
        <Input
          value={key}
          placeholder="sk-..."
          onChange={(e) => {
            setKey(e.target.value);
          }}
        />
        <div className="flex flex-row gap-2 justify-end w-full">
          <TestOpenAIKey openaiKey={key} />
          <SaveKey
            apiBaseUrl={OpenAIBaseUrl}
            name={name}
            apiKey={key}
            provider="OpenAI"
            orgId={orgId}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export { LLMKeyDialog };

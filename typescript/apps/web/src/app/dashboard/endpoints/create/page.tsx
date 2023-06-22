"use client";

import { useOrganization } from "@clerk/nextjs";
import clsx from "clsx";
import { CheckCircle } from "lucide-react";
import { useState, useTransition } from "react";
import { ClipLoader } from "react-spinners";

import { createClassifier } from "@/app/actions/classifiers";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function CreateEndpoint() {
  const endpointCards: {
    title: string;
    description: string;
    link?: string;
    disabled: boolean;
  }[] = [
    {
      title: "Text Classification",
      description:
        "Classify any text with LLMs and train custom models from resulting data",
      link: "/dashboard/endpoints/create/classifier",
      disabled: false,
    },
    {
      title: "Entity Extraction",
      description: "Define a schema for extracting entities from text",
      disabled: true,
    },
    {
      title: "Semantic Search",
      description: "Upload and search documents by semantic similarity",
      disabled: true,
    },
  ];
  const org = useOrganization().organization;
  const orgId = org?.id;
  const [isPending, onStart] = useTransition();
  const [endpointName, setEndpointName] = useState("");
  const [selectedEndpoint, setSelectedEndpoint] = useState("");

  return (
    <div className="flex flex-col p-4 max-w-[800px] gap-y-6 px-8">
      <h1 className="text-2xl font-semibold">Create an endpoint</h1>
      <div>
        <div className="font-semibold">Name</div>
        <div className="mt-2 flex flex-col gap-2">
          <Input
            className="w-48"
            placeholder="Classifier name"
            value={endpointName}
            onChange={(e) => setEndpointName(e.target.value)}
          />
        </div>
      </div>

      <div>
        <div className="font-semibold pt-2">Select an endpoint type</div>
      </div>
      <div className="grid grid-cols-2 gap-6">
        {endpointCards.map((card) => (
          <EndpointCard
            key={card.title}
            selected={selectedEndpoint === card.title}
            {...card}
            onClick={() => setSelectedEndpoint(card.title)}
          />
        ))}
      </div>
      <div className="mx-auto mt-5 max-w-fit sm:mt-6">
        <Button
          type="button"
          className="items-center flex flex-row gap-x-2"
          disabled={!orgId || isPending || !selectedEndpoint || !endpointName}
          onClick={() =>
            onStart(async () => {
              return await createClassifier(orgId!, {
                name: endpointName,
              });
            })
          }
        >
          {isPending && (
            <>
              <ClipLoader size={16} color={"white"} />{" "}
            </>
          )}
          Create
        </Button>
      </div>
    </div>
  );
}

const EndpointCard = ({
  title,
  description,
  link,
  disabled,
  selected,
  onClick,
}: {
  title: string;
  description: string;
  link?: string;
  disabled?: boolean;
  selected: boolean;
  onClick: () => void;
}) => {
  const cardContent = (
    <Card
      className={clsx([
        disabled
          ? "bg-muted/20 pointer-events-none cursor-default"
          : "hover:bg-muted/60 cursor-pointer",
        selected && "border-green-400 border-2",
      ])}
      onClick={() => {
        if (!disabled) {
          onClick();
        }
      }}
    >
      <CardHeader>
        <CardTitle
          className={clsx("flex flex-row gap-x-2 items-center", {
            ["text-foreground/50"]: disabled,
          })}
        >
          {title}{" "}
          {selected && <CheckCircle className="w-6 h-6 text-green-400" />}
        </CardTitle>
      </CardHeader>

      <CardContent>
        <p
          className={`text-base ${
            disabled ? "text-foreground/50" : "text-foreground/60"
          }`}
        >
          {description}
          {disabled && " (coming soon)"}
        </p>
      </CardContent>
    </Card>
  );

  if (!disabled && !link) {
    return <>Misconfigured card</>;
  }

  return <>{cardContent}</>;
};

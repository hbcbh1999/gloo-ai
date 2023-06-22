import Link from "next/link";

import { ConfigurationCard } from "./ConfigurationCard";

import type { ClientClassifier } from "@/app/actions/classifiers";
import { Button } from "@/components/ui/button";

export const PipelineConfigurationPanelHeader: React.FC<{
  classifierId: string;
}> = ({ classifierId }) => {
  return (
    <div className="gap- flex flex-row items-center gap-x-6">
      <h4 className="text-xl font-semibold">Pipeline Configurations</h4>
      <Button>
        <Link
          className="whitespace-nowrap"
          href={`/dashboard/endpoints/classifiers/${classifierId}/playground?configId=new`}
        >
          Create new
        </Link>
      </Button>
    </div>
  );
};

export const PipelineConfigurationPanel: React.FC<{
  classifier: ClientClassifier;
}> = ({ classifier }) => {
  const configurations = classifier.classifierConfig;
  return (
    <div className="flex flex-wrap gap-6 py-4 pb-12">
      {configurations.map((config) => (
        <ConfigurationCard
          classifier={classifier}
          config={config}
          key={config.id}
          isDefault={classifier.defaultConfigId === config.id}
          klasses={classifier.klasses}
        />
      ))}
    </div>
  );
};

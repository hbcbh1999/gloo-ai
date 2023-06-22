import { KlassesGroup } from "../_components/PipelineView";

import CreateModel from "./CreateModel";
import DeleteButton from "./DeleteModel";

import { notEmpty } from "@/app/_utils/utils";
import { availableTrainedEndpoints } from "@/app/actions/classifiers";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";

type ClientAvailableModels = Awaited<
  ReturnType<typeof availableTrainedEndpoints>
>;

const ModelDisplay = ({
  model,
  klasses,
}: {
  model: ClientAvailableModels["models"][number];
  klasses: ClientAvailableModels["klasses"];
}) => {
  return (
    <Card>
      <CardHeader>
        <div>Model Id: {model.id}</div>
      </CardHeader>
      <CardContent>
        <KlassesGroup
          klasses={klasses
            .map((k) => {
              const rev = k.versions.at(0);
              if (!rev) return null;
              return {
                id: k.id,
                version: rev.versionId,
                name: rev.name,
                description: rev.description,
                isLocal: false,
              };
            })
            .filter(notEmpty)}
          selection={{
            available: model.supportedKlasses,
            supressed: [],
          }}
        />
      </CardContent>
      <CardFooter>
        <DeleteButton modelId={model.id} />
      </CardFooter>
    </Card>
  );
};

const AddModelPage = async ({ params }: { params: { endpointId: string } }) => {
  const classifierId = params.endpointId;

  const { models, klasses } = await availableTrainedEndpoints(classifierId);

  return (
    <div className="flex flex-col p-4">
      <CreateModel classifierId={classifierId} klasses={klasses} />
      <div className="flex flex-wrap gap-2">
        {models.map((model) => (
          <ModelDisplay model={model} klasses={klasses} key={model.id} />
        ))}
      </div>
    </div>
  );
};

export default AddModelPage;

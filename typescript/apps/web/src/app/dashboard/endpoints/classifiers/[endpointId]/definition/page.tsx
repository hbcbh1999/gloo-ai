import KlassesPanel from "./_components/KlassesPanel";
import {
  PipelineConfigurationPanel,
  PipelineConfigurationPanelHeader,
} from "./_components/PipelineConfigurationPanel";

import { ScrollArea } from "@/components/ui/scroll-area";
import { getClassifier } from "@/app/actions/classifiers";

export default async function Definition(params: {
  params: { endpointId: string };
}) {
  const classifier = await getClassifier(params.params.endpointId);

  return (
    <div className="flex h-full w-full divide-x">
      <ScrollArea
        type="auto"
        className="flex h-full w-fit min-w-[400px] max-w-sm flex-col gap-4 overflow-y-auto bg-muted/50 p-8"
      >
        <h4 className="text-xl font-semibold">Classes</h4>
        <KlassesPanel classes={classifier.klasses} />
      </ScrollArea>

      <ScrollArea
        type="auto"
        className="flex h-full w-full flex-col gap-4 overflow-y-auto p-8"
      >
        <PipelineConfigurationPanelHeader classifierId={classifier.id} />
        <PipelineConfigurationPanel classifier={classifier} />
      </ScrollArea>
    </div>
  );
}

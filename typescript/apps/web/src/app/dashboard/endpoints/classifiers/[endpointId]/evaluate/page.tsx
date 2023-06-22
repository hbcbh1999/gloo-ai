import { getClassifier } from "@/app/actions/classifiers";

export default async function Evaluate(params: {
  params: { endpointId: string };
}) {
  const classifier = await getClassifier(params.params.endpointId);

  return (
    <div className="flex flex-col h-full w-full">
      <div>Evaluate</div>
      {/* {
        classifier.classifierConfig.map((config) => {
            return (
                <div key={config.id}>
                <div>{config.name}</div>
                <Select
                    className="w-full"
                    options={config.options}
                    value={config.value}
                    onChange={(value) => {
                    config.value = value;
                    }}
                />
                </div>
            );
            })
      } */}

      <div>{classifier.id}</div>
    </div>
  );
}

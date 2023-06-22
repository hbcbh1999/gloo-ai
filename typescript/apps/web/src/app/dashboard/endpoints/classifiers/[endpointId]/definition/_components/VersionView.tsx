"use client";

import PipelineView from "../../_components/PipelineView";

import type {
  ClientClassifier,
  ClientClassifierConfigVersion,
  ClientKlass,
} from "@/app/actions/classifiers";

export const VersionView: React.FC<{
  classifier: ClientClassifier;
  version: ClientClassifierConfigVersion;
  klasses: ClientKlass[];
}> = ({ classifier, version, klasses }) => {
  const normalizer = classifier.normalizers.find(
    (n) => n.id === version.normalizationId
  );
  const ftPredictor = classifier.ftPredictors.find(
    (n) => n.id === version.ftPredictorId
  );
  const llmPredictor = classifier.llmPredictors.find(
    (n) => n.id === version.llmPredictorId
  );

  return (
    <PipelineView
      klasses={klasses.flatMap((k) =>
        k.versions.map((r) => ({
          id: k.id,
          version: r.versionId,
          name: r.name,
          description: r.description,
          isLocal: false,
        }))
      )}
      normalizer={normalizer?.llmOptions ?? null}
      ftPredictor={
        ftPredictor
          ? {
              options: ftPredictor.ftOptions,
              klasses: {
                available: ftPredictor.supportedKlasses,
                supressed: ftPredictor.blacklistedKlassIds,
              },
            }
          : null
      }
      llmPredictor={
        llmPredictor
          ? {
              options: llmPredictor.llmOptions,
              klasses: {
                available: llmPredictor.supportedKlasses,
                supressed: llmPredictor.blacklistedKlassIds,
              },
            }
          : null
      }
    />
  );
};

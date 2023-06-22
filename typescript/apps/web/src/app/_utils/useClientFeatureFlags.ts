import { useFeatureFlags } from "@harnessio/ff-react-client-sdk";

const useFlags = () => {
  const flags = useFeatureFlags() as Record<string, unknown>;

  return {
    classification: flags.classification as boolean,
    classificationEndpoints: flags.classificationEndpoints as boolean,
  };
};

export default useFlags;

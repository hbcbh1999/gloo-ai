"use client";

import type {
  ConfigurationOverride,
  Klass,
  LlmPredictorOverride,
  NormalizerOverride,
} from "@gloo/client-internal";
import type { TraditionalPredictorOverride } from "@gloo/client-internal";
import type { SetRecoilState } from "recoil";
import { selectorFamily } from "recoil";
import { useRecoilCallback } from "recoil";
import type { ReadonlyURLSearchParams } from "next/navigation";
import { atomFamily, selector } from "recoil";
import { atom } from "recoil";
import type { KlassDetails } from "@gloo/database";
import type { InternalPredictResponse } from "@gloo/client-internal/src/fern/api/resources/v1";

import type { Classifier } from "./types";

import type {
  ClientClassifierConfig,
  ClientClassifierConfigVersion,
  ClientKlass,
} from "@/app/actions/classifiers";

export const LocalKlassVersion = -2;
export type ClientKlassDetails = KlassDetails & { isLocal: boolean };

function makeid(length: number) {
  let result = "";
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const charactersLength = characters.length;
  let counter = 0;
  while (counter < length) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
    counter += 1;
  }
  return result;
}

const getAtom = <T>(key: string) =>
  atom<T | null>({
    key: key,
    default: null,
  });

export const orgIdAtom = atom<string>({
  key: "orgIdAtom",
  default: "DEFAULT",
});

export const selectedConfigId = atom<{ id: string; version: number } | null>({
  key: "selectedConfigId",
  default: null,
});

export const inputsAtom = atom<{ text: string; enabled: boolean }[]>({
  key: "inputsAtom",
  default: [],
});
export const normalizerSettingsAtom =
  getAtom<NormalizerOverride>("normalizerSettings");
export const llmPredictorEditorAtom =
  getAtom<LlmPredictorOverride>("llmPredictorEditor");
export const ftPredictorEditorAtom =
  getAtom<TraditionalPredictorOverride>("ftPredictorEditor");

export const classifierAtom = getAtom<Classifier>("classifierAtom");

export const loadedConfigAtom = selectorFamily<
  {
    config: ClientClassifierConfig;
    version: ClientClassifierConfigVersion;
    normalizer: NormalizerOverride | null;
    ftPredictor: TraditionalPredictorOverride | null;
    llmPredictor: LlmPredictorOverride | null;
    klasses: ClientKlass[];
  } | null,
  { configId: string; version: number }
>({
  key: "loadedConfigAtom",
  get:
    ({ configId, version: _r }) =>
      ({ get }) => {
        const classifier = get(classifierAtom);
        if (!classifier) return null;

        const config = classifier.classifierConfig.find((c) => c.id === configId);
        const version = config?.versions.find((r) => r.versionId === _r);
        if (!config || !version) return null;

        const { ftPredictorId, normalizationId, llmPredictorId } = version;
        const normalizer = classifier.normalizers.find(
          (n) => n.id === normalizationId
        );
        const normalizerOverride: NormalizerOverride | null = normalizer
          ? normalizer.llmOptions
          : null;

        const ftPredictor = classifier.ftPredictors.find(
          (p) => p.id === ftPredictorId
        );
        const ftOverride: TraditionalPredictorOverride | null = ftPredictor
          ? {
            options: ftPredictor.ftOptions,
            klasses: {
              supressed: ftPredictor.blacklistedKlassIds,
              available: ftPredictor.supportedKlasses,
            },
          }
          : null;

        const llmPredictor = classifier.llmPredictors.find(
          (p) => p.id === llmPredictorId
        );
        const llmOverride: LlmPredictorOverride | null = llmPredictor
          ? {
            options: llmPredictor.llmOptions,
            klasses: {
              supressed: llmPredictor.blacklistedKlassIds,
              available: llmPredictor.supportedKlasses,
            },
          }
          : null;

        return {
          config,
          version,
          normalizer: normalizerOverride,
          ftPredictor: ftOverride,
          llmPredictor: llmOverride,
          klasses: classifier.klasses,
        };
      },
});

export const enabledAtom = atomFamily<boolean, "normalizer" | "llm" | "ft">({
  key: "enabledAtom",
  default: (param) => {
    if (param === "llm") return true;
    return false;
  },
});
export const klassListAtom = atom<ClientKlassDetails[]>({
  key: "klassListAtom",
  default: [],
});

export const klassItemsMapAtom = selector({
  key: "klassItemsMapAtom",
  get: ({ get }) => {
    const klassList = get(klassListAtom);
    // Group by id.
    const klassMap = new Map<string, Map<number, ClientKlassDetails>>();
    klassList.forEach((k) => {
      if (!klassMap.has(k.id)) {
        klassMap.set(k.id, new Map());
      }
      klassMap.get(k.id)?.set(k.version, { ...k });
    });
    return klassMap;
  },
});

export const useKlassAtom = () => {
  const createKlass = useRecoilCallback(({ set }) => () => {
    const newKlass = {
      id: `local_klass_${makeid(16)}`,
      version: LocalKlassVersion,
      name: "new_class",
      description: "description of when to select this class",
      isLocal: true,
    };
    set(klassListAtom, (klasses) => [...klasses, newKlass]);
    set(llmPredictorEditorAtom, (llm) => {
      if (!llm) return null;

      return {
        options: llm.options,
        klasses: {
          available: [...llm.klasses.available, newKlass],
          supressed: llm.klasses.supressed,
        },
      };
    });
  });

  const removeKlass = useRecoilCallback(
    ({ set }) =>
      (id: string, version: number) => {
        if (version === LocalKlassVersion) {
          set(klassListAtom, (klasses) => klasses.filter((k) => k.id !== id));
          set(llmPredictorEditorAtom, (llm) => {
            if (!llm) return null;

            return {
              options: llm.options,
              klasses: {
                available: llm.klasses.available.filter((k) => k.id !== id),
                supressed: llm.klasses.supressed.filter((k) => k !== id),
              },
            };
          });
        }
      }
  );

  const llmKlassSettings = useRecoilCallback(
    ({ set, snapshot }) =>
      async (
        id: string,
        version: number,
        update: { active: boolean } | { name: string } | { description: string }
      ) => {
        const klasses = await snapshot.getPromise(klassListAtom);
        const klass = klasses.find((k) => k.id === id && k.version === version);

        if (!klass) return;

        if (!("active" in update)) {
          set(klassListAtom, (klasses) => {
            if (version !== LocalKlassVersion) {
              // This is editing some live version.
              return [
                ...klasses,
                {
                  ...klass,
                  version: LocalKlassVersion,
                  ...update,
                  isLocal: true,
                },
              ];
            } else {
              // This is editing a local version.
              return klasses.map((k) => {
                if (k.id === id && k.version === version) {
                  return { ...k, ...update };
                }
                return k;
              });
            }
          });
        }

        set(llmPredictorEditorAtom, (llm) => {
          if (!llm) return null;

          const idx = llm.klasses.available.findIndex((k) => k.id === id);

          if ("active" in update) {
            if (update.active) {
              if (idx >= 0) {
                const available = [...llm.klasses.available];
                available.splice(idx, 1, { id, version });
                return {
                  options: llm.options,
                  klasses: {
                    available,
                    supressed: llm.klasses.supressed,
                  },
                };
              }
              // Add the klass to the available list.
              return {
                options: llm.options,
                klasses: {
                  available: [...llm.klasses.available, { id, version }],
                  supressed: llm.klasses.supressed.filter((k) => k !== id),
                },
              };
            } else {
              if (idx === -1) return llm;
              // Remove the klass from the available list.
              return {
                ...llm,
                options: llm.options,
                klasses: {
                  available: llm.klasses.available.filter((k) => k.id !== id),
                  supressed: llm.klasses.supressed.filter((k) => k !== id),
                },
              };
            }
          } else {
            if (idx === -1) return llm;
            if (version !== LocalKlassVersion) {
              // Create a new local version that is editable.
              return {
                options: llm.options,
                klasses: {
                  available: llm.klasses.available.map((k) => {
                    if (k.id === id && k.version === version) {
                      return { id, version: LocalKlassVersion };
                    }
                    return k;
                  }),
                  supressed: llm.klasses.supressed,
                },
              };
            }
            return llm;
          }
        });
      }
  );

  return { createKlass, removeKlass, llmKlassSettings };
};

export type PredictionOutcome =
  | { status: "running" | "waiting" | "error" | "skipped" }
  | { status: "completed"; response: InternalPredictResponse };

export const resultHistoryAtom = atom<
  {
    configuration: ConfigurationOverride;
    inputs: { input_id?: string; text: string }[];
    output: PredictionOutcome[];
  }[]
>({
  key: "resultHistoryAtom",
  default: [],
});

export const pipelineViewAtom = selector<{
  normalizer: NormalizerOverride | null;
  ftPredictor: TraditionalPredictorOverride | null;
  llmPredictor: LlmPredictorOverride | null;
  klasses: ClientKlassDetails[];
}>({
  key: "pipelineViewAtom",
  get: ({ get }) => {
    const enabledNormalizer = get(enabledAtom("normalizer"));
    const enabledLLM = get(enabledAtom("llm"));
    const enabledFT = get(enabledAtom("ft"));
    const normalizerSettings = get(normalizerSettingsAtom);
    const llmPredictorEditor = get(llmPredictorEditorAtom);
    const ftPredictorEditor = get(ftPredictorEditorAtom);
    const klassShortList: Klass[] = [];
    if (enabledLLM && llmPredictorEditor) {
      klassShortList.push(...llmPredictorEditor.klasses.available);
    }
    if (enabledFT && ftPredictorEditor) {
      klassShortList.push(...ftPredictorEditor.klasses.available);
    }
    // Remove duplicates.
    const klassList = klassShortList
      .sort()
      .filter(
        (klass, idx) =>
          klassShortList.findIndex(
            (k) => k.id === klass.id && k.version === klass.version
          ) === idx
      );
    const allKlasses = get(klassListAtom);
    const filteredKlasses = allKlasses.filter((k) =>
      klassList.find(
        (klass) => k.id === klass.id && k.version === klass.version
      )
    );

    return {
      normalizer:
        enabledNormalizer && normalizerSettings ? normalizerSettings : null,
      ftPredictor: enabledFT && ftPredictorEditor ? ftPredictorEditor : null,
      llmPredictor:
        enabledLLM && llmPredictorEditor ? llmPredictorEditor : null,
      klasses: filteredKlasses,
    };
  },
});

const defaultOptions: NormalizerOverride = {
  prompt: `You are a user who spoke with an agent.
  
  paraphrase the last "user" message to what the user is actually asking, unless the user is only thanking, then don't paraphrase. 
  
  Rules:
  - use first person
  - do not keep any names of the user
  - the paraphrased message should stand alone
  - if the "user" is upset, match the same tone of voice`,
  failureMode: "IGNORE",
  llmConfig: {
    modelName: "gpt-3.5-turbo",
  },
};
const defaultPredictorOptions: LlmPredictorOverride = {
  options: {
    failureMode: "IGNORE",
    llmConfig: {
      modelName: "gpt-3.5-turbo",
    },
    skipPriorAvailableKlasses: true,
    addPriorSelectedKlasses: true,
    inputDescription: "emails",
    objective: "classes",
  },
  klasses: {
    available: [],
    supressed: [],
  },
};

export const setFromClassifier = (
  set: SetRecoilState,
  classifier: Classifier,
  searchParams: ReadonlyURLSearchParams | null,
  orgId: string
) => {
  set(orgIdAtom, orgId);
  // TODO: support passing in any config id.
  const configId = searchParams?.get("configId");
  const versionId = searchParams?.get("version");

  // First set the normalizer.
  const config = classifier.classifierConfig.find((c) => c.id === configId);
  const intVersionId = versionId ? parseInt(versionId) : undefined;
  const version = versionId
    ? config?.versions.find((r) => r.versionId === intVersionId)
    : config?.versions.at(-1);
  set(classifierAtom, classifier);
  set(
    klassListAtom,
    classifier.klasses
      .map((k) =>
        k.versions.map((r) => ({
          id: k.id,
          version: r.versionId,
          name: r.name,
          description: r.description,
          isLocal: false,
        }))
      )
      .flatMap((r) => r)
  );

  if (!config || !configId || !version) {
    set(selectedConfigId, null);
    set(normalizerSettingsAtom, defaultOptions);
    set(llmPredictorEditorAtom, defaultPredictorOptions);
    set(ftPredictorEditorAtom, null);
    return;
  }

  // Otherwise load from the config.
  set(selectedConfigId, { id: configId, version: version.versionId });
  const { ftPredictorId, normalizationId, llmPredictorId } = version;
  const normalizer = classifier.normalizers.find(
    (n) => n.id === normalizationId
  );
  const normalizerOverride = normalizer ? normalizer.llmOptions : null;
  set(normalizerSettingsAtom, normalizerOverride);
  set(enabledAtom("normalizer"), !!normalizerOverride);

  const ftPredictor = classifier.ftPredictors.find(
    (p) => p.id === ftPredictorId
  );
  const ftOverride = ftPredictor
    ? {
      options: ftPredictor.ftOptions,
      klasses: {
        supressed: ftPredictor.blacklistedKlassIds,
        available: ftPredictor.supportedKlasses,
      },
    }
    : null;
  set(ftPredictorEditorAtom, ftOverride);
  set(enabledAtom("ft"), !!ftOverride);

  const llmPredictor = classifier.llmPredictors.find(
    (p) => p.id === llmPredictorId
  );
  const llmOverride = llmPredictor
    ? {
      options: llmPredictor.llmOptions,
      klasses: {
        supressed: llmPredictor.blacklistedKlassIds,
        available: llmPredictor.supportedKlasses,
      },
    }
    : null;
  set(llmPredictorEditorAtom, llmOverride);
  set(enabledAtom("llm"), !!llmOverride);
};

import type { AxiosRequestConfig } from "axios";
import axios from "axios";

import { GlooApiClient } from "./fern/Client";

// export interface GlooClient {
//   indexCreate(request: CreateIndexRequest): Promise<IndexResponse>;
//   indexList(): Promise<IndexListResponse>;
//   indexDelete(indexId: string): Promise<void>;
//   indexClient({ indexId }: { indexId: string }): IndexClient;
//   classifierClient({
//     classifierId,
//   }: {
//     classifierId: string;
//   }): ClassifierClient;
//   classifierCreate({
//     name,
//   }: CreateClassifierRequest): Promise<ClassifierResponse>;
//   classifierList(): Promise<GlooApi.ClassifierResponse[]>;
//   classifierDelete(classifierId: string): Promise<void>;
//   qaClient(): Qa;
//   predictionsClient(): Predictions;
//   classifierClientV1(): Classifier;
//   _httpRaw<T>(
//     method: "GET" | "POST" | "DELETE",
//     route: string,
//     params?: unknown,
//     data?: unknown
//   ): Promise<T>;
// }

export class GlooClient {
  private baseUrl: string;
  private readonly config: AxiosRequestConfig;
  private readonly fernGloo: GlooApiClient;

  constructor(
    secretKey: string,
    baseUrl?: string,
    config?: AxiosRequestConfig,
    tag?: string,
    org?: string
  ) {
    this.baseUrl = baseUrl ?? "https://api.trygloo.com";
    this.config = config ?? {};
    if (!this.config.headers) {
      this.config.headers = {};
    }
    this.config.headers["Authorization"] = `Bearer ${secretKey}`;
    this.config.headers["Content-Type"] = "application/json";
    if (tag) {
      this.config.headers["X-Gloo-Tag"] = tag;
    }
    if (org) {
      this.config.headers["X-Gloo-Org"] = org;
    }
    this.fernGloo = new GlooApiClient({
      token: secretKey,
      environment: baseUrl,
      xGlooTag: tag,
      xGlooOrg: org,
    });
  }
  _internalClient(): GlooApiClient {
    throw new Error("Method not implemented.");
  }

  public async _httpRaw<T>(
    method: "GET" | "POST" | "DELETE",
    route: string,
    params?: unknown,
    data?: unknown
  ) {
    return (
      await axios(this.baseUrl + route, {
        ...this.config,
        method: method,
        data,
        params,
      })
    ).data as T;
  }

  public classifierClientV1() {
    return this.fernGloo.v1.classification;
  }
}

export function createGlooClient({
  secretKey,
  baseUrl,
  config,
  tag,
  org,
}: {
  secretKey: string;
  baseUrl?: string;
  config?: AxiosRequestConfig;
  tag?: string;
  org?: string;
}): GlooClient {
  return new GlooClient(secretKey, baseUrl, config, tag, org);
}

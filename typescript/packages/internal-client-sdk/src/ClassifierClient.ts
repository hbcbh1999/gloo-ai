import type { GlooApiClient } from "./fern";
import type { ClassificationRequest } from "./fern/api";

export class ClassifierClient {
  private readonly classifierId: string;
  private readonly fernGloo: GlooApiClient;
  constructor(classifierId: string, fernGlooClient: GlooApiClient) {
    this.classifierId = classifierId;
    this.fernGloo = fernGlooClient;
  }

  public async classify(request: ClassificationRequest) {
    return await this.fernGloo.classifiers.classify(this.classifierId, request);
  }
}

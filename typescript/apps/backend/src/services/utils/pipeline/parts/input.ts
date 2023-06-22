import type { PrismaBase, Types } from "@gloo/database";
import { Prisma, uuidGen } from "@gloo/database";
import { prisma } from "@gloo/database";

import type { Pipeline, PipelineInput } from "../types";

class Input {
  private metadata: PrismaBase.InputText | null = null;

  constructor(public id: string | null, private text: string | null) {}

  static fromPipelineInput(input: PipelineInput): Input {
    if ("inputId" in input) {
      return new Input(input.inputId, null);
    }
    return new Input(null, input.text);
  }

  private async loadFromCache(): Promise<string> {
    if (this.text) return this.text;
    if (!this.id) {
      throw new Error("Must configure ID");
    }
    this.metadata = await prisma.inputText.findUniqueOrThrow({
      where: {
        id: this.id,
      },
    });
    this.text = this.metadata.text;
    return this.text;
  }

  public async data(): Promise<string> {
    return await this.loadFromCache();
  }

  public async save(
    pipeline: Pipeline,
    requestMetadata: Types.RequestMetadata
  ): Promise<string> {
    if (!this.id) {
      if (!this.text) {
        throw new Error("Must configure text");
      }
      this.id = uuidGen("input");
      await prisma.inputText.create({
        data: {
          id: this.id,
          text: this.text,
          classifierId: pipeline.classifierId,
          requestMetadata: requestMetadata,
        },
      });
    }

    return this.id;
  }
}

export { Input };

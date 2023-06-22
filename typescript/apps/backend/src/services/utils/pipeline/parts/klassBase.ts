import type { Types, KlassDetails } from "@gloo/database";
import { prisma } from "@gloo/database";

import type { Pipeline } from "../types";

interface IKlassManager {
  all(items: Types.Klass[]): Promise<KlassDetails[]>;
}

class KlassManager implements IKlassManager {
  private _klassMap: Map<string, Map<number, KlassDetails>> = new Map();

  static fromPipeline(pipeline: Pipeline): KlassManager {
    const m = new KlassManager();
    pipeline.klassList.forEach((klass) => m.add(klass));
    return m;
  }

  private add(klass: KlassDetails): void {
    if (!this._klassMap.has(klass.id)) {
      this._klassMap.set(klass.id, new Map());
    }
    this._klassMap.get(klass.id)?.set(klass.version, klass);
  }

  public async all(items: Types.Klass[]): Promise<KlassDetails[]> {
    const pending = items.filter(
      (i) => this._klassMap.get(i.id)?.get(i.version) === undefined
    );

    // Fetch the pending items from the database.
    if (pending.length > 0) {
      const query = await prisma.klassVersion.findMany({
        where: {
          OR: pending.map((p) => ({
            klassId: p.id,
            versionId: p.version,
          })),
        },
      });
      if (query.length !== pending.length) {
        throw new Error("Missing klass");
      }
      query.forEach((klass) => {
        this.add({
          id: klass.klassId,
          version: klass.versionId,
          description: klass.description,
          name: klass.name,
        });
      });
    }
    return items.map((i) => {
      const klass = this._klassMap.get(i.id)?.get(i.version);
      if (!klass) {
        throw new Error("Missing klass");
      }
      return klass;
    });
  }
}

export { KlassManager };
export type { IKlassManager };

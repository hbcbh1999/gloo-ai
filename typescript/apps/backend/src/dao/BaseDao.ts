import type {
  AttributeValue,
  DeleteItemCommandInput,
  PutItemCommandInput,
  QueryCommandInput,
  ScanCommandInput,
} from "@aws-sdk/client-dynamodb";
import type {
  DynamoDBDocument,
  UpdateCommandInput,
} from "@aws-sdk/lib-dynamodb";
import { stringify } from "safe-stable-stringify";

import { GlooApi } from "../api/generated";
import type { KeysOfType } from "../config";
import config from "../config";

import { ddbDocClient } from "./AWSClient";

type ItemType = Record<string, any>;

export enum ModelTable {
  SECRET = 3,
  ORGS = 8,
  QA = 9,
}

export const getTableName = (_t: ModelTable) => {
  switch (_t) {
    case ModelTable.SECRET:
      return config.TABLE_SECRETS;
    case ModelTable.ORGS:
      return config.TABLE_ORGS;
    case ModelTable.QA:
      return config.TABLE_QA;
  }
};

class BaseModelLoader {
  static async getItem<T extends ItemType>(
    tableName: ModelTable,
    documentClient: DynamoDBDocument,
    key: Record<string, string>
  ) {
    try {
      const result = await documentClient.get({
        TableName: getTableName(tableName),
        Key: key,
      });
      return result.Item ? (result.Item as T) : null;
    } catch (err) {
      console.error(`Failed to get item: ${err}`);
      return null;
    }
  }

  static async scanItems<T extends ItemType>(
    tableName: ModelTable,
    documentClient: DynamoDBDocument
  ): Promise<T[]> {
    const command: ScanCommandInput = {
      TableName: getTableName(tableName),
    };
    const items: T[] = [];

    try {
      let result = await documentClient.scan(command);
      if (result.Items) {
        items.push(...result.Items.map((i) => i as T));
      }

      while (result.LastEvaluatedKey) {
        command.ExclusiveStartKey = result.LastEvaluatedKey;
        result = await documentClient.scan(command);
        if (result.Items) {
          items.push(...result.Items.map((i) => i as T));
        }
      }
    } catch (err) {
      console.error(`Failed to scan items: ${err}`);
    }

    return items;
  }

  static async queryItems<T extends ItemType>(
    tableName: ModelTable,
    documentClient: DynamoDBDocument,
    indexName: undefined | string,
    keyConditionExpression: string,
    expressionAttributeValues: { [key: string]: any }
  ): Promise<T[]> {
    const command: QueryCommandInput = {
      TableName: getTableName(tableName),
      IndexName: indexName,
      KeyConditionExpression: keyConditionExpression,
      ExpressionAttributeValues: expressionAttributeValues,
    };

    const items: T[] = [];

    try {
      let result = await documentClient.query(command);
      if (result.Items) {
        items.push(...result.Items.map((i) => i as T));
      }

      while (result.LastEvaluatedKey) {
        command.ExclusiveStartKey = result.LastEvaluatedKey;
        result = await documentClient.query(command);
        if (result.Items) {
          items.push(...result.Items.map((i) => i as T));
        }
      }
    } catch (err) {
      console.error(`Failed to query items: ${err}`);
    }
    return items;
  }
}

export const toStableString = <T>(object: T) => {
  return stringify(object, (_key, val) => {
    if (val instanceof Set) return [...val];
    if (val instanceof Map) return [...val.entries()];
    return val;
  });
};

function _getSetDifference<T>(setA: Set<T>, setB: Set<T>) {
  return new Set([...setA].filter((element) => !setB.has(element)));
}

export function getSetDifference<T>(prev: Set<T>, current: Set<T>) {
  return {
    added: _getSetDifference(current, prev),
    removed: _getSetDifference(prev, current),
  };
}

export function getMapDifference<K, V>(prev: Map<K, V>, current: Map<K, V>) {
  const res: {
    removed: K[];
    upserted: Map<K, V>;
  } = {
    removed: [],
    upserted: new Map(),
  };

  // Iterate over the first map and add any keys/values that are not in the second map
  for (const [key, value] of prev) {
    if (!current.has(key)) {
      res.removed.push(key);
    } else if (toStableString(value) != toStableString(current.get(key))) {
      res.upserted.set(key, value);
    }
  }

  // Iterate over the second map and add any keys/values that are not in the first map
  for (const [key, value] of current) {
    if (
      !prev.has(key) ||
      toStableString(value) != toStableString(prev.get(key))
    ) {
      res.upserted.set(key, value);
    }
  }

  return res;
}

class UpdateItem<T extends ItemType> {
  private updates: {
    SET: string[];
    DELETE: string[];
    REMOVE: string[];
    ADD: string[];
  };
  private attributeNames: Record<string, string>;
  private attributeValues: Record<string, any>;

  constructor() {
    this.updates = {
      ADD: [],
      DELETE: [],
      REMOVE: [],
      SET: [],
    };
    this.attributeNames = {};
    this.attributeValues = {};
  }

  compare(
    k: string & KeysOfType<T, number | string | boolean | undefined>,
    _prev: T,
    _curr: T
  ) {
    const prev = _prev[k];
    const curr = _curr[k];
    if (prev !== curr) {
      if (curr === undefined) {
        this.updates.REMOVE.push(`#${k}`);
        this.attributeNames[`#${k}`] = k;
      } else {
        this.updates.SET.push(`#${k} = :${k}`);
        this.attributeNames[`#${k}`] = k;
        this.attributeValues[`:${k}`] = curr;
      }
    }
  }

  compareObject<U>(k: string & KeysOfType<T, U>, _prev: T, _curr: T) {
    const prev = _prev[k];
    const curr = _curr[k];
    if (toStableString(prev) !== toStableString(curr)) {
      this.attributeNames[`#${k}`] = k;
      this.attributeValues[`:${k}`] = curr;
      if (prev === undefined) {
        this.updates.ADD.push(`#${k} = :${k}`);
      } else if (curr === undefined) {
        this.updates.DELETE.push(`#${k} :${k}`);
      } else {
        this.updates.SET.push(`#${k} = :${k}`);
      }
    }
  }

  compareArray<U>(k: string & KeysOfType<T, Array<U>>, _prev: T, _curr: T) {
    const prev = _prev[k] ?? ([] as Array<U>);
    const curr = _curr[k];
    if (toStableString(prev) !== toStableString(curr)) {
      this.updates.SET.push(`#${k} = :${k}`);
      this.attributeNames[`#${k}`] = k;
      this.attributeValues[`:${k}`] = curr;
    }
  }

  compareSet<U>(k: string & KeysOfType<T, Set<U>>, _prev: T, _curr: T) {
    const prev = _prev[k] ?? new Set<U>();
    const curr = _curr[k];
    const { added, removed } = getSetDifference<U>(prev, curr);
    if (added.size + removed.size > 0) {
      this.attributeNames[`#${k}`] = k;
    }
    if (added.size > 0 && added.size === curr.size) {
      this.updates.SET.push(`#${k} = :${k}`);
      this.attributeValues[`:${k}`] = curr;
    } else {
      if (added.size) {
        this.updates.ADD.push(`#${k} :a_${k}`);
        this.attributeValues[`:a_${k}`] = added;
      }
      if (removed.size) {
        this.updates.DELETE.push(`#${k} :r_${k}`);
        this.attributeValues[`:r_${k}`] = removed;
      }
    }
  }
  compareMap<U>(
    mapAttributeName: string & KeysOfType<T, Map<string, U>>,
    _prev: T,
    _curr: T
  ) {
    const prev = _prev[mapAttributeName] ?? new Map<string, U>();
    const curr = _curr[mapAttributeName];
    const { removed, upserted } = getMapDifference<string, U>(prev, curr);
    console.log({ removed, upserted });
    // replacing a current item
    if (upserted.size > 0 && upserted.size === curr.size) {
      console.log("replacing a current item");
      this.updates.SET.push(`#${mapAttributeName} = :${mapAttributeName}`);
      this.attributeNames[`#${mapAttributeName}`] = mapAttributeName;
      this.attributeValues[`:${mapAttributeName}`] = curr;
    } else {
      // add new element
      upserted.forEach((val, e) => {
        const eSanitiezed = `v_${e.replace(/-/g, "_")}`;
        this.updates.SET.push(
          `#${mapAttributeName}.#${eSanitiezed} = :newItemValue`
        );
        this.attributeNames[`#${mapAttributeName}`] = `${mapAttributeName}`;
        this.attributeNames[`#${eSanitiezed}`] = e;
        this.attributeValues[`:newItemValue`] = val;
      });

      removed.forEach((r) => {
        const rSanitized = `v_${r.replace(/-/g, "_")}`;
        this.updates.REMOVE.push(`#${mapAttributeName}.#${rSanitized}`);
        this.attributeNames[`#${mapAttributeName}`] = mapAttributeName;
        this.attributeNames[`#${rSanitized}`] = r;
      });
    }
  }
  async run(table: ModelTable, key: Record<string, string>): Promise<void> {
    const command: UpdateCommandInput = {
      TableName: getTableName(table),
      Key: key,
      UpdateExpression: "",
      ExpressionAttributeNames: this.attributeNames,
      ExpressionAttributeValues:
        Object.keys(this.attributeValues).length > 0
          ? this.attributeValues
          : undefined,
    };
    Object.entries(this.updates).forEach((entry) => {
      const key = entry[0];
      const val = entry[1].join(", ");
      if (val.length > 0) {
        command.UpdateExpression += `${key} ${val} `;
      }
    });
    if (command.UpdateExpression!.length === 0) {
      return;
    }
    await ddbDocClient.update(command);
  }
}

abstract class BaseDao<T extends ItemType> {
  protected data: T;
  protected key: Record<string, AttributeValue>;
  protected loadedFromDb: boolean;
  protected readonly tableName: ModelTable;
  protected readonly documentClient: DynamoDBDocument;
  protected _initial: string;

  constructor(
    tableName: ModelTable,
    documentClient: DynamoDBDocument,
    data: T,
    loadedFromDb: boolean,
    key: Record<string, any>
  ) {
    this.tableName = tableName;
    this.documentClient = documentClient;
    this.data = data;
    this._initial = toStableString(data) ?? "";
    this.loadedFromDb = loadedFromDb;
    this.key = key;
  }

  protected async putItem() {
    const command: PutItemCommandInput = {
      TableName: getTableName(this.tableName),
      Item: this.data,
    };
    await this.documentClient.put(command);
  }

  protected async deleteItem() {
    const command: DeleteItemCommandInput = {
      Key: this.key,
      TableName: getTableName(this.tableName),
    };

    await this.documentClient.delete(command);
  }

  protected async updateItem() {
    throw new GlooApi.NotImplemented({ message: "updateItem not implemented" });
  }

  private get dirty() {
    return !this.loadedFromDb || this._initial !== toStableString(this.data);
  }

  async save() {
    if (!this.dirty) {
      return;
    }

    if (this.loadedFromDb) {
      await this.updateItem();
    } else {
      await this.putItem();
    }
  }
}

export { BaseDao, BaseModelLoader, UpdateItem };

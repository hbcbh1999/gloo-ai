import { v4 as uuidv4 } from 'uuid';
import type { Request } from "express";
import type { DynamoDBDocument, QueryCommandInput } from "@aws-sdk/lib-dynamodb";

import * as GlooErrors from "../api/generated/api/resources/error"

import { generateSecretKey, hashSecret } from "./auth";
import { BaseDao, BaseModelLoader, getTableName, ModelTable, UpdateItem } from "./BaseDao";
import { ddbDocClient } from "./AWSClient";


interface SecretItemKey {
    // This is hashed.
    secretKey: string;
}

interface SecretItem extends SecretItemKey {
    orgId: string;
    secretId: string;
    name: string;
    internalGlobalAccess: boolean;
    manageApps: boolean;
    readApp: string; // either appId or ALL
    writeApp: string; // either appId or ALL
    classifier: {
        manage: boolean;
        read: string; // either appId or ALL
        write: string; // either appId or ALL
    }
}


class SecretDao extends BaseDao<SecretItem> {
    private constructor(documentClient: DynamoDBDocument, data: SecretItem, { loadedFromDb }: { loadedFromDb: boolean }) {
        super(ModelTable.SECRET, documentClient, data, loadedFromDb, {
            secretKey: data.secretKey
        });
    }

    static async loadByVal(secretId: string) {
        // TODO: Prevent creating a document with the same source.
        const response = await ddbDocClient.query({
            TableName: getTableName(ModelTable.SECRET),
            IndexName: 'secretIdIndex',
            KeyConditionExpression: "#secretId = :secretId",
            ExpressionAttributeNames: {
                "#secretId": "secretId",
            },
            ExpressionAttributeValues: {
                ":secretId": secretId,
            }
        });
        const { Count = 0, Items = [] } = response;

        if (Count < 1) {
            throw new GlooErrors.NotFound({ message: "Secret not found" });
        } else if (Count > 1) {
            throw new GlooErrors.ServerError({ message: "Multiple secrets with the same secretId" });
        }
        return new SecretDao(ddbDocClient, Items[0] as SecretItem, { loadedFromDb: true });
    }

    static async loadByOrg(orgId: string) {
        const command: QueryCommandInput = {
            TableName: getTableName(ModelTable.SECRET),
            IndexName: 'orgIdIndex',
            KeyConditionExpression: "#orgId = :orgId",
            ExpressionAttributeNames: {
                "#orgId": "orgId",
            },
            ExpressionAttributeValues: {
                ":orgId": orgId,
            }
        }

        const secrets: SecretDao[] = [];
        try {
            let result = await ddbDocClient.query(command);
            if (result.Items) {
                secrets.push(...result.Items.map((i) => new SecretDao(ddbDocClient, i as SecretItem, { loadedFromDb: true })));
            }

            while (result.LastEvaluatedKey) {
                command.ExclusiveStartKey = result.LastEvaluatedKey;
                result = await ddbDocClient.query(command);
                if (result.Items) {
                    secrets.push(...result.Items.map((i) => new SecretDao(ddbDocClient, i as SecretItem, { loadedFromDb: true })));
                }
            }
        } catch (err) {
            console.error(`Failed to query items: ${err}`);
        }
        return secrets;
    }

    static async load(req: Pick<Request, 'headers'>) {
        const secretKey = hashSecret(req.headers);
        const data = await BaseModelLoader.getItem<SecretItem>(ModelTable.SECRET, ddbDocClient, { secretKey });
        if (!data) {
            throw new GlooErrors.NotAuthorized({
                message: 'Invalid secret key'
            });
        }
        return new SecretDao(ddbDocClient, data, { loadedFromDb: true });
    }

    static create(item: Pick<SecretItem, 'orgId' | 'name'>, appScope: string) {
        const secretId = uuidv4();
        // Generate a new secret id.
        const { key, hashedKey } = generateSecretKey();
        return {
            key, secret: new SecretDao(ddbDocClient, {
                ...item, secretKey: hashedKey, internalGlobalAccess: false, manageApps: appScope === 'ALL', readApp: appScope, writeApp: appScope, secretId, classifier: {
                    manage: appScope === 'ALL',
                    read: appScope,
                    write: appScope
                }
            }, { loadedFromDb: false })
        };
    }


    public orgId(req: Pick<Request, 'get'>): string {
        if (this.data.internalGlobalAccess) {
            const orgId = req.get('X-GLOO-ORG');
            if (!orgId || orgId.length === 0) {
                throw new GlooErrors.NotAuthorized({
                    message: 'Missing org'
                });
            }
            return orgId;
        }
        return this.data.orgId;
    }


    auth(req: Pick<Request, 'get'>, action: { type: 'GLOO_INTERNAL' } | { type: 'ORG' } | { type: 'APP_READ' | 'APP_WRITE', indexId: string } | { type: 'CLASSIFIER_MANAGE' } | { type: 'CLASSIFIER_READ' | 'CLASSIFIER_WRITE', classifierId: string }) {
        if (action.type === 'GLOO_INTERNAL') {
            if (this.data.internalGlobalAccess) return;
        }
        if (action.type === 'ORG') {
            if (this.data.manageApps) return;
        }
        if (action.type === 'APP_READ') {
            // TODO: Validate if that app belongs to the org.
            if (this.data.readApp === 'ALL' || this.data.readApp === action.indexId) return;

        }
        if (action.type === 'APP_WRITE') {
            // TODO: Validate if that app belongs to the org.
            if (this.data.writeApp === 'ALL' || this.data.writeApp === action.indexId) return;
        }

        if (action.type === 'CLASSIFIER_MANAGE') {
            if (this.data.classifier.manage) return;
        }
        if (action.type === 'CLASSIFIER_READ') {
            if (this.data.classifier.read === 'ALL' || this.data.classifier.read === action.classifierId) return;
        }
        if (action.type === 'CLASSIFIER_WRITE') {
            if (this.data.classifier.write === 'ALL' || this.data.classifier.write === action.classifierId) return;
        }

        if (this.data.internalGlobalAccess) {
            // Validate org is set correctly.
            // orgId will throw if it is not set.
            this.orgId(req);
            return;
        }

        throw new GlooErrors.NotAuthorized({
            message: 'Not authorized to perform this action'
        });
    }

    async delete() {
        await this.deleteItem();
    }

    update(changes: Partial<Pick<SecretItem, 'manageApps' | 'readApp' | 'writeApp' | 'name'>>) {
        if (changes.manageApps) {
            this.data.manageApps = changes.manageApps;
        }
        if (changes.readApp) {
            this.data.readApp = changes.readApp;
        }
        if (changes.writeApp) {
            this.data.writeApp = changes.writeApp;
        }
        if (changes.name) {
            this.data.name = changes.name;
        }
    }

    toResponse() {
        return {
            secretId: this.data.secretId,
            name: this.data.name,
            manageApps: this.data.manageApps,
            readApp: this.data.readApp,
            writeApp: this.data.writeApp,
        }
    }

    protected async updateItem() {
        const start: SecretItem = JSON.parse(this._initial);
        const update = new UpdateItem<SecretItem>();
        update.compare('name', start, this.data);
        update.compare('readApp', start, this.data);
        update.compare('writeApp', start, this.data);
        update.compare('manageApps', start, this.data);
        await update.run(ModelTable.SECRET, {
            secretKey: this.data.secretKey
        });
    }
}

export { SecretDao };

import type { DynamoDBDocument } from "@aws-sdk/lib-dynamodb";

import * as GlooErrors from "../api/generated/api/resources/error"
import { createStripeCustomer } from "../utils/billing";

import { ddbDocClient } from "./AWSClient";
import { BaseDao, BaseModelLoader, ModelTable, UpdateItem } from "./BaseDao";


interface OrgItemKey {
    // This is hashed.
    orgId: string;
}

interface OrgItem extends OrgItemKey {
    name: string;
    email: string;
    stripeCustomerId: string;
    stripeSubscriptionId: string;
}


class OrgDao extends BaseDao<OrgItem> {
    private constructor(documentClient: DynamoDBDocument, data: OrgItem, { loadedFromDb }: { loadedFromDb: boolean }) {
        super(ModelTable.ORGS, documentClient, data, loadedFromDb, {
            orgId: data.orgId
        });
    }

    static async load(orgId: string) {
        const data = await BaseModelLoader.getItem<OrgItem>(ModelTable.ORGS, ddbDocClient, { orgId: orgId });
        if (!data) {
            throw new GlooErrors.NotFound({ message: `Org ${orgId} not found` });
        }
        return new OrgDao(ddbDocClient, data, { loadedFromDb: true });
    }

    static async create(item: Pick<OrgItem, 'name' | 'email' | 'orgId'>) {
        // Check if org already exists.
        const existingOrg = await BaseModelLoader.getItem<OrgItem>(ModelTable.ORGS, ddbDocClient, { orgId: item.orgId });
        if (existingOrg) {
            throw new GlooErrors.BadRequest({ message: `Org ${item.orgId} already exists` });
        }

        // Generate a new secret id.
        const { customer: { id: stripeCustomerId }, subscription: { id: stripeSubscriptionId } } = await createStripeCustomer(item.orgId, item.email);

        return new OrgDao(ddbDocClient, { ...item, stripeCustomerId: stripeCustomerId, stripeSubscriptionId: stripeSubscriptionId }, { loadedFromDb: false });
    }

    update(data: Partial<Pick<OrgItem, 'email' | 'name'>>) {
        this.data = { ...this.data, ...data };
    }

    async delete() {
        await this.deleteItem();
    }

    toResponse() {
        return {
            orgId: this.data.orgId,
            name: this.data.name,
            email: this.data.email,
            stripeCustomerId: this.data.stripeCustomerId,
            stripeSubscriptionId: this.data.stripeSubscriptionId,
        }
    }

    protected async updateItem() {
        const start: OrgItem = JSON.parse(this._initial);
        const update = new UpdateItem<OrgItem>();
        update.compare('name', start, this.data);
        update.compare('email', start, this.data);
        update.compare('stripeCustomerId', start, this.data);
        update.compare('stripeSubscriptionId', start, this.data);
        await update.run(ModelTable.ORGS, {
            orgId: this.data.orgId
        });
    }
}

export { OrgDao };

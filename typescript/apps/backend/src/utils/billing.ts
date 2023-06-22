import type { Request, Response, NextFunction } from "express";
import Stripe from "stripe";
import * as Sentry from "@sentry/node";

import config from "../config";
import { OrgDao } from "../dao/OrgDao";
import * as GlooErrors from "../api/generated/api/resources/error";

// Replace with your Stripe secret key
const stripe = new Stripe(config.STRIPE_SECRET_KEY, {
  apiVersion: "2022-11-15",
});

export const createStripeCustomer = async (
  orgId: string,
  orgAdminEmail: string
) => {
  // Create a new customer in Stripe
  const customer = await stripe.customers.create({
    email: orgAdminEmail,
    description: orgId,
  });

  console.log("Created new customer in Stripe: ", customer.id);

  // Create a subscription for the customer with the metered price
  const subscription = await stripe.subscriptions.create({
    customer: customer.id,
    description: "Default subscription created by gloo-service",
    items: [{ price: config.STRIPE_PRICING_PLAN }],
    collection_method: "send_invoice",
    days_until_due: 30,
  });

  console.log("Created new subscription in Stripe: ", subscription.id);

  return { customer, subscription };
};

export const addMeteredUsage = async (
  res: { locals: any },
  orgId: string,
  meteredCost: number
) => {
  try {
    const org = await OrgDao.load(orgId);
    res.locals.apiUsage = {
      meteredCost,
      subscriptionId: org.toResponse().stripeSubscriptionId,
    };
  } catch (err) {
    if (err instanceof GlooErrors.NotFound) {
      // Log in Sentry
      Sentry.captureEvent({
        message: `Org ${orgId} not found`,
        level: "warning",
        tags: {
          type: "billing",
          orgId,
        },
      });
    } else {
      throw err;
    }
  }
};

// Middleware to track usage and apply billing
export const stripeUsageMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Check for successful API call on response finish
  res.on("finish", async () => {
    // APIs are responsible for setting the meteredCost and subscriptionId on the response.
    const { meteredCost = undefined, subscriptionId = undefined } =
      res.locals.apiUsage ?? {};
    if (
      res.statusCode >= 200 &&
      res.statusCode < 300 &&
      meteredCost &&
      subscriptionId
    ) {
      try {
        // Retrieve the subscription
        const subscription = await stripe.subscriptions.retrieve(
          subscriptionId
        );

        // Get the usage-based price ID from the subscription
        const subscriptionItem = subscription.items.data.find(
          (item) =>
            item.price.recurring &&
            item.price.recurring.usage_type === "metered"
        );

        if (subscriptionItem) {
          // Increment the usage for the usage-based price
          await stripe.subscriptionItems.createUsageRecord(
            subscriptionItem.id,
            {
              quantity: meteredCost, // Increment the usage by 1 for each successful API request
              timestamp: "now",
              action: "increment",
            }
          );
        }
      } catch (err) {
        // Log in Sentry but don't fail the API call
        Sentry.captureEvent({
          message: `Billing failed`,
          level: "warning",
          tags: {
            type: "billing",
            subscriptionId,
          },
        });
      }
    }
  });

  // Call the next middleware or route handler
  next();
};

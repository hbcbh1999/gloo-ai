import crypto from "node:crypto";

import type { Request } from "express";

import { GlooApi } from "../api/generated";

const SECRET_PREFIX = "gloo:";

// Generate a secret key and return the random key and hashed key
export function generateSecretKey() {
  // Generate a 32-byte (256-bit) random key
  const key = crypto.randomBytes(32);

  // Hash the key using the SHA-256 algorithm
  const hashedKey = crypto.createHash("sha256").update(key).digest("hex");

  // Return the random key and hashed key
  return { key: SECRET_PREFIX + key.toString("hex"), hashedKey };
}

// Validate a provided key against a stored hashed key
export function hashSecret(headers: Request["headers"]) {
  const token = headers.authorization?.split("Bearer ")[1];
  if (!token) {
    throw new GlooApi.NotAuthorized({
      message: "Missing authorization header",
    });
  }

  // Check that the provided key is a string starting with "gloo-"
  if (!token.startsWith(SECRET_PREFIX)) {
    throw new GlooApi.NotAuthorized({
      message: "Invalid secret key",
    });
  }

  // Extract the hexadecimal string from the provided key (after the gloo prefix)
  const keySuffix = token.substring(SECRET_PREFIX.length);

  // Check that the rest of the string is a valid hexadecimal string
  const isHex = /^[0-9a-fA-F]+$/.test(keySuffix);

  // Convert the provided key to a Buffer object
  const key = Buffer.from(keySuffix, isHex ? "hex" : undefined);

  // Hash the provided key using the SHA-256 algorithm
  const hashedKey = crypto.createHash("sha256").update(key).digest("hex");
  return hashedKey;
}

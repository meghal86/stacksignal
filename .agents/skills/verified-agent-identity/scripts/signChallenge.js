#!/usr/bin/env node

/**
 * signChallenge.js - Signs a challenge with a DID's private key
 *
 * Usage: node scripts/signChallenge.js --challenge <challenge> --did <did>
 *
 * Output: JWS token string
 */

const {
  JWSPacker,
  byteEncoder,
  byteDecoder,
  KmsKeyType,
} = require("@0xpolygonid/js-sdk");
const { getInitializedRuntime } = require("./shared/bootstrap");
const {
  parseArgs,
  formatError,
  outputSuccess,
  createDidDocument,
  getAuthResponseMessage,
} = require("./shared/utils");

async function main() {
  try {
    const args = parseArgs();

    if (!args.challenge) {
      console.error("Error: --challenge is required");
      console.error(
        "Usage: node scripts/signChallenge.js --challenge <challenge>",
      );
      process.exit(1);
    }

    const { kms, didsStorage } = await getInitializedRuntime();

    // Get DID entry - either specific DID or default
    const entry = args.did
      ? await didsStorage.find(args.did)
      : await didsStorage.getDefault();

    if (!entry) {
      const errorMsg = args.did
        ? `No DID ${args.did} found`
        : "No default DID found";
      console.error(errorMsg);
      process.exit(1);
    }

    const didDocument = createDidDocument(entry.did, entry.publicKeyHex);

    // Create local DID resolver
    const resolveDIDDocument = {
      resolve: () => Promise.resolve({ didDocument }),
    };

    // Create JWS packer
    const jws = new JWSPacker(kms, resolveDIDDocument);

    // Create authorization response message
    const authMessage = getAuthResponseMessage(
      entry.did,
      args.challenge,
      didDocument,
    );

    const msgBytes = byteEncoder.encode(JSON.stringify(authMessage));

    // Sign the message
    let token;
    try {
      token = await jws.pack(msgBytes, {
        alg: "ES256K-R",
        issuer: entry.did,
        did: entry.did,
        keyType: KmsKeyType.Secp256k1,
      });
    } catch (err) {
      throw new Error(`Failed to sign challenge: ${err.message}`);
    }

    const tokenString = byteDecoder.decode(token);
    outputSuccess(tokenString);
  } catch (error) {
    console.error(formatError(error));
    process.exit(1);
  }
}

main();

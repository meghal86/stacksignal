#!/usr/bin/env node

/**
 * generateChallenge.js - Generates a random challenge for a DID
 *
 * Usage: node scripts/generateChallenge.js --did <did>
 *
 * Output: Challenge string (number as string)
 */

const { randomInt } = require("crypto");
const { getInitializedRuntime } = require("./shared/bootstrap");
const { parseArgs, formatError, outputSuccess } = require("./shared/utils");

async function main() {
  try {
    const args = parseArgs();

    if (!args.did) {
      console.error("Error: --did parameter is required");
      console.error("Usage: node scripts/generateChallenge.js --did <did>");
      process.exit(1);
    }

    const { challengeStorage } = await getInitializedRuntime();

    // Generate random challenge
    const challenge = randomInt(0, 10000000000).toString();

    // Save challenge to storage
    await challengeStorage.save(args.did, challenge);

    outputSuccess(challenge);
  } catch (error) {
    console.error(formatError(error));
    process.exit(1);
  }
}

main();

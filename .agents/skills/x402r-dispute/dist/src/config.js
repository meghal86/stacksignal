/**
 * CLI configuration — loads from ~/.x402r/config.json, .env, and env vars.
 * Priority: env vars > .env > config file > defaults
 */
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
const CONFIG_DIR = path.join(os.homedir(), ".x402r");
const CONFIG_FILE = path.join(CONFIG_DIR, "config.json");
/**
 * Load config from ~/.x402r/config.json
 */
export function loadConfigFile() {
    if (!fs.existsSync(CONFIG_FILE)) {
        return {};
    }
    try {
        return JSON.parse(fs.readFileSync(CONFIG_FILE, "utf-8"));
    }
    catch {
        return {};
    }
}
/**
 * Save config to ~/.x402r/config.json
 */
export function saveConfigFile(config) {
    if (!fs.existsSync(CONFIG_DIR)) {
        fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }
    // Merge with existing config
    const existing = loadConfigFile();
    const merged = { ...existing, ...config };
    // Remove undefined/null values
    for (const key of Object.keys(merged)) {
        if (merged[key] === undefined || merged[key] === null) {
            delete merged[key];
        }
    }
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(merged, null, 2));
}
/**
 * Get resolved config: env vars > .env > config file > defaults
 */
export function getConfig() {
    const file = loadConfigFile();
    return {
        privateKey: process.env.PRIVATE_KEY || file.privateKey,
        operatorAddress: process.env.OPERATOR_ADDRESS || file.operatorAddress,
        arbiterUrl: process.env.ARBITER_URL || file.arbiterUrl || "http://localhost:3000",
        networkId: process.env.NETWORK_ID || file.networkId || "eip155:84532",
        rpcUrl: process.env.RPC_URL || file.rpcUrl || "https://sepolia.base.org",
        pinataApiKey: process.env.PINATA_API_KEY || file.pinataApiKey,
        pinataSecretKey: process.env.PINATA_SECRET_KEY || file.pinataSecretKey,
    };
}
/**
 * Print current config (masked key)
 */
export function printConfig() {
    const config = getConfig();
    console.log("\n=== x402r CLI Config ===");
    console.log("  Private Key:", config.privateKey ? `${config.privateKey.slice(0, 6)}...${config.privateKey.slice(-4)}` : "(not set)");
    console.log("  Operator:", config.operatorAddress || "(not set)");
    console.log("  Arbiter URL:", config.arbiterUrl);
    console.log("  Network:", config.networkId);
    console.log("  RPC URL:", config.rpcUrl);
    console.log("  Pinata API Key:", config.pinataApiKey ? `${config.pinataApiKey.slice(0, 8)}...` : "(not set)");
    console.log(`\n  Config file: ${CONFIG_FILE}`);
}
//# sourceMappingURL=config.js.map
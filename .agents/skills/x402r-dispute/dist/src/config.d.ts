/**
 * CLI configuration — loads from ~/.x402r/config.json, .env, and env vars.
 * Priority: env vars > .env > config file > defaults
 */
export interface CliConfigFile {
    privateKey?: string;
    operatorAddress?: string;
    arbiterUrl?: string;
    networkId?: string;
    rpcUrl?: string;
    pinataApiKey?: string;
    pinataSecretKey?: string;
}
/**
 * Load config from ~/.x402r/config.json
 */
export declare function loadConfigFile(): CliConfigFile;
/**
 * Save config to ~/.x402r/config.json
 */
export declare function saveConfigFile(config: CliConfigFile): void;
/**
 * Get resolved config: env vars > .env > config file > defaults
 */
export declare function getConfig(): Required<Pick<CliConfigFile, "networkId" | "arbiterUrl">> & CliConfigFile;
/**
 * Print current config (masked key)
 */
export declare function printConfig(): void;

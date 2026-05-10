/**
 * CLI setup — creates viem clients from resolved config.
 * Ported from x402r-sdk/examples/dev-tools/shared/cli-setup.ts with config file support.
 */
import { type PublicClient, type WalletClient } from "viem";
import { type PrivateKeyAccount } from "viem/accounts";
import { type ResolvedAddresses } from "@x402r/core";
export interface CliSetup {
    account: PrivateKeyAccount;
    publicClient: PublicClient;
    walletClient: WalletClient;
    networkId: string;
    addresses: ResolvedAddresses;
    operatorAddress: `0x${string}`;
    arbiterUrl: string;
}
/**
 * Initialize CLI: validates config, creates viem clients.
 */
export declare function initCli(): CliSetup;
/**
 * Read-only setup — no private key required.
 */
export declare function initReadOnly(): Pick<CliSetup, "publicClient" | "networkId" | "addresses" | "arbiterUrl" | "operatorAddress">;

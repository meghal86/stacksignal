/**
 * IPFS pinning via Pinata API.
 * Falls back to inline string if no Pinata key configured.
 */
/**
 * Pin JSON to IPFS via Pinata.
 * Returns IPFS CID if Pinata configured, otherwise returns JSON string directly.
 */
export declare function pinToIpfs(data: Record<string, unknown>): Promise<string>;

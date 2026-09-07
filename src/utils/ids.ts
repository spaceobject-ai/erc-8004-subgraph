import { Address, BigInt, Bytes } from "@graphprotocol/graph-ts";

/**
 * Builds the `Agent` entity ID: the identity registry address plus the
 * on-chain agent ID (schema.graphql's `Agent` comment). Both the Identity
 * Registry handlers (registry = the event's own address) and the Reputation
 * Registry handlers (registry = the `identityRegistry` data source context)
 * need to compute this same ID to find or create the same `Agent`.
 *
 * The two parts are joined with "-" rather than concatenated as raw bytes:
 * `registry` is a fixed-width address, but `agentId` is a variable-length
 * decimal string, so a delimiter keeps the encoding unambiguous.
 */
export function agentEntityId(registry: Address, agentId: BigInt): Bytes {
  return Bytes.fromUTF8(registry.toHexString() + "-" + agentId.toString());
}

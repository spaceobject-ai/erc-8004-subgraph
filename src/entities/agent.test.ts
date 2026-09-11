import { assert, describe, test } from "matchstick-as";
import { Address, BigInt } from "@graphprotocol/graph-ts";
import { agentEntityId } from "./agent";

const CHAIN_ID = BigInt.fromI32(11155111);
const REGISTRY = Address.fromString("0x8004A818BFB912233c491871b3d84c89A494BD9e");

describe("agentEntityId", () => {
  test("encodes chain ID, registry, and agent ID joined with ':'", () => {
    const id = agentEntityId(CHAIN_ID, REGISTRY, BigInt.fromI32(7));
    assert.stringEquals("11155111:0x8004a818bfb912233c491871b3d84c89a494bd9e:7", id.toString());
  });

  test("is stable for the same chain, registry, and agent ID", () => {
    const a = agentEntityId(CHAIN_ID, REGISTRY, BigInt.fromI32(7));
    const b = agentEntityId(CHAIN_ID, REGISTRY, BigInt.fromI32(7));
    assert.bytesEquals(a, b);
  });

  test("differs for different agent IDs on the same registry", () => {
    const a = agentEntityId(CHAIN_ID, REGISTRY, BigInt.fromI32(1));
    const b = agentEntityId(CHAIN_ID, REGISTRY, BigInt.fromI32(12));
    assert.assertTrue(a.notEqual(b));
  });

  test("differs for different registries with the same agent ID", () => {
    const other = Address.fromString("0x8004B663056A597Dffe9eCcC1965A193B7388713");
    const a = agentEntityId(CHAIN_ID, REGISTRY, BigInt.fromI32(1));
    const b = agentEntityId(CHAIN_ID, other, BigInt.fromI32(1));
    assert.assertTrue(a.notEqual(b));
  });

  test("differs for the same registry address on different chains", () => {
    // chain.config.json deploys the registries at identical addresses on
    // several chains; the chain ID keeps the entity IDs globally unique.
    const a = agentEntityId(CHAIN_ID, REGISTRY, BigInt.fromI32(1));
    const b = agentEntityId(BigInt.fromI32(84532), REGISTRY, BigInt.fromI32(1));
    assert.assertTrue(a.notEqual(b));
  });
});

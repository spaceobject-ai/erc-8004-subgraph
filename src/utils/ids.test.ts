import { assert, describe, test } from "matchstick-as";
import { Address, BigInt } from "@graphprotocol/graph-ts";
import { agentEntityId } from "./ids";

const REGISTRY = Address.fromString("0x8004A818BFB912233c491871b3d84c89A494BD9e");

describe("agentEntityId", () => {
  test("is stable for the same registry and agent ID", () => {
    const a = agentEntityId(REGISTRY, BigInt.fromI32(7));
    const b = agentEntityId(REGISTRY, BigInt.fromI32(7));
    assert.bytesEquals(a, b);
  });

  test("differs for different agent IDs on the same registry", () => {
    const a = agentEntityId(REGISTRY, BigInt.fromI32(1));
    const b = agentEntityId(REGISTRY, BigInt.fromI32(12));
    assert.assertTrue(a.notEqual(b));
  });

  test("differs for different registries with the same agent ID", () => {
    const other = Address.fromString("0x8004B663056A597Dffe9eCcC1965A193B7388713");
    const a = agentEntityId(REGISTRY, BigInt.fromI32(1));
    const b = agentEntityId(other, BigInt.fromI32(1));
    assert.assertTrue(a.notEqual(b));
  });
});

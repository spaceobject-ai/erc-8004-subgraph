import { assert, describe, test } from "matchstick-as";
import { Address, BigInt } from "@graphprotocol/graph-ts";
import { registryEntityId } from "./registry";

const CHAIN_ID = BigInt.fromI32(11155111);
const REGISTRY = Address.fromString("0x8004A818BFB912233c491871b3d84c89A494BD9e");

describe("registryEntityId", () => {
  test("encodes chain ID and registry address joined with ':'", () => {
    const id = registryEntityId(CHAIN_ID, REGISTRY);
    assert.stringEquals("11155111:0x8004a818bfb912233c491871b3d84c89a494bd9e", id.toString());
  });

  test("is stable for the same chain and registry", () => {
    const a = registryEntityId(CHAIN_ID, REGISTRY);
    const b = registryEntityId(CHAIN_ID, REGISTRY);
    assert.bytesEquals(a, b);
  });

  test("differs for the same registry address on different chains", () => {
    // chain.config.json deploys the registries at identical addresses on
    // several chains; the chain ID keeps the entity IDs globally unique.
    const a = registryEntityId(CHAIN_ID, REGISTRY);
    const b = registryEntityId(BigInt.fromI32(84532), REGISTRY);
    assert.assertTrue(a.notEqual(b));
  });

  test("differs for different registries on the same chain", () => {
    const other = Address.fromString("0x8004B663056A597Dffe9eCcC1965A193B7388713");
    const a = registryEntityId(CHAIN_ID, REGISTRY);
    const b = registryEntityId(CHAIN_ID, other);
    assert.assertTrue(a.notEqual(b));
  });
});

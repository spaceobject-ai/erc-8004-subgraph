import { assert, describe, test } from "matchstick-as";
import { Address, BigInt } from "@graphprotocol/graph-ts";
import { feedbackEntityId } from "./feedback";

const CHAIN_ID = BigInt.fromI32(11155111);
const REGISTRY = Address.fromString("0x8004B663056A597Dffe9eCcC1965A193B7388713");
const CLIENT = Address.fromString("0x0000000000000000000000000000000000000001");

describe("feedbackEntityId", () => {
  test("encodes all five parts joined with ':'", () => {
    const id = feedbackEntityId(CHAIN_ID, REGISTRY, BigInt.fromI32(7), CLIENT, BigInt.fromI32(2));
    assert.stringEquals(
      "11155111:0x8004b663056a597dffe9eccc1965a193b7388713:7:" +
        "0x0000000000000000000000000000000000000001:2",
      id.toString(),
    );
  });

  test("differs by feedback index for the same agent and client", () => {
    const a = feedbackEntityId(CHAIN_ID, REGISTRY, BigInt.fromI32(7), CLIENT, BigInt.fromI32(0));
    const b = feedbackEntityId(CHAIN_ID, REGISTRY, BigInt.fromI32(7), CLIENT, BigInt.fromI32(1));
    assert.assertTrue(a.notEqual(b));
  });
});

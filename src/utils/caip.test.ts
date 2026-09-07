import { assert, describe, test } from "matchstick-as";
import { Address, BigInt } from "@graphprotocol/graph-ts";
import { parseCaip10, toEip155Caip10 } from "./caip";

describe("parseCaip10", () => {
  test("splits namespace, chain ID, and reference", () => {
    const parsed = parseCaip10("eip155:11155111:0x8004a6090Cd10A7288092483047B097295Fb8847");
    assert.stringEquals("eip155", parsed.namespace!);
    assert.stringEquals("11155111", parsed.chainId!);
    assert.stringEquals("0x8004a6090Cd10A7288092483047B097295Fb8847", parsed.reference!);
  });

  test("rejoins a reference that itself contains a colon", () => {
    const parsed = parseCaip10(
      "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp:8oo48pya1SZD23ZhzoNMhxR2UGb8BRa41Su4qP9EuaWm",
    );
    assert.stringEquals("solana", parsed.namespace!);
    assert.stringEquals("5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp", parsed.chainId!);
    assert.stringEquals("8oo48pya1SZD23ZhzoNMhxR2UGb8BRa41Su4qP9EuaWm", parsed.reference!);
  });

  test("returns null parts for a value with too few segments", () => {
    const parsed = parseCaip10("0x8004a6090Cd10A7288092483047B097295Fb8847");
    assert.assertTrue(parsed.namespace == null);
    assert.assertTrue(parsed.chainId == null);
    assert.assertTrue(parsed.reference == null);
  });
});

describe("toEip155Caip10", () => {
  test("formats a chain ID and address as eip155", () => {
    const formatted = toEip155Caip10(
      BigInt.fromI32(84532),
      Address.fromString("0x8004a6090Cd10A7288092483047B097295Fb8847"),
    );
    assert.stringEquals("eip155:84532:0x8004a6090cd10a7288092483047b097295fb8847", formatted);
  });
});

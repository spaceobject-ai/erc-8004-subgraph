import { assert, describe, test } from "matchstick-as";
import { Bytes } from "@graphprotocol/graph-ts";
import { isZeroHash } from "./bytes";

describe("isZeroHash", () => {
  test("is true for an all-zero bytes32", () => {
    assert.assertTrue(isZeroHash(Bytes.fromUint8Array(new Uint8Array(32))));
  });

  test("is false when any byte is set", () => {
    const value = new Uint8Array(32);
    value[31] = 1;
    assert.assertTrue(!isZeroHash(Bytes.fromUint8Array(value)));
  });

  test("is true for empty bytes", () => {
    assert.assertTrue(isZeroHash(Bytes.empty()));
  });
});

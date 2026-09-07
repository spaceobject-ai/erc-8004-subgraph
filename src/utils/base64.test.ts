import { assert, describe, test } from "matchstick-as";
import { base64Decode, base64DecodeToString } from "./base64";

describe("base64DecodeToString", () => {
  test("decodes a simple ASCII payload", () => {
    // "hello" in base64
    assert.stringEquals("hello", base64DecodeToString("aGVsbG8=")!);
  });

  test("decodes JSON without padding", () => {
    // {"a":1} in base64, no padding needed (8 chars)
    assert.stringEquals('{"a":1}', base64DecodeToString("eyJhIjoxfQ==")!);
  });

  test("decodes payloads that need one padding character", () => {
    // "hi" in base64
    assert.stringEquals("hi", base64DecodeToString("aGk=")!);
  });

  test("ignores embedded whitespace", () => {
    assert.stringEquals("hello", base64DecodeToString("aGVs\nbG8=")!);
  });

  test("returns null for invalid characters", () => {
    assert.assertTrue(base64DecodeToString("not-valid-base64!!") == null);
  });

  test("decodes an empty string to an empty result", () => {
    assert.i32Equals(0, base64Decode("")!.length);
  });
});

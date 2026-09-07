import { assert, describe, test } from "matchstick-as";
import {
  classifyUri,
  decodeDataUri,
  URI_KIND_ARWEAVE,
  URI_KIND_DATA,
  URI_KIND_HTTP,
  URI_KIND_HTTPS,
  URI_KIND_IPFS,
  URI_KIND_NONE,
  URI_KIND_OTHER,
} from "./uri";

describe("classifyUri", () => {
  test("classifies each known scheme", () => {
    assert.stringEquals(URI_KIND_DATA, classifyUri("data:application/json,{}"));
    assert.stringEquals(URI_KIND_IPFS, classifyUri("ipfs://bafyabc"));
    assert.stringEquals(URI_KIND_ARWEAVE, classifyUri("ar://abc123"));
    assert.stringEquals(URI_KIND_HTTPS, classifyUri("https://example.com/a.json"));
    assert.stringEquals(URI_KIND_HTTP, classifyUri("http://example.com/a.json"));
  });

  test("is case-insensitive on the scheme", () => {
    assert.stringEquals(URI_KIND_DATA, classifyUri("DATA:application/json,{}"));
    assert.stringEquals(URI_KIND_IPFS, classifyUri("IPFS://bafyabc"));
  });

  test("classifies an empty URI as NONE", () => {
    assert.stringEquals(URI_KIND_NONE, classifyUri(""));
  });

  test("classifies plain JSON without a scheme as OTHER", () => {
    assert.stringEquals(URI_KIND_OTHER, classifyUri('{"name":"agent"}'));
  });
});

describe("decodeDataUri", () => {
  test("decodes a plain (non-base64) payload", () => {
    const decoded = decodeDataUri('data:application/json,{"name":"agent"}');
    assert.stringEquals('{"name":"agent"}', decoded!);
  });

  test("decodes a base64 payload", () => {
    // data:application/json;base64,<base64 of {"name":"agent"}>
    const decoded = decodeDataUri("data:application/json;base64,eyJuYW1lIjoiYWdlbnQifQ==");
    assert.stringEquals('{"name":"agent"}', decoded!);
  });

  test("decodes a payload with extra media type parameters", () => {
    const decoded = decodeDataUri(
      "data:application/json;charset=utf-8;base64,eyJuYW1lIjoiYWdlbnQifQ==",
    );
    assert.stringEquals('{"name":"agent"}', decoded!);
  });

  test("falls back to plain JSON when base64 is mislabeled", () => {
    // Producers sometimes label plain JSON as base64 by mistake.
    const decoded = decodeDataUri('data:application/json;base64,{"name":"agent"}');
    assert.stringEquals('{"name":"agent"}', decoded!);
  });

  test("returns null for a non-data URI", () => {
    assert.assertTrue(decodeDataUri("https://example.com/a.json") == null);
  });

  test("returns null when there is no comma separator", () => {
    assert.assertTrue(decodeDataUri("data:application/json") == null);
  });
});

import { assert, describe, test } from "matchstick-as";
import { BigInt, json, JSONValue } from "@graphprotocol/graph-ts";
import {
  asBool,
  asObject,
  asString,
  asStringArray,
  asStringOrNumber,
  asWholeBigInt,
  asWholeI32,
  describeJsonValue,
  isDecimalString,
} from "./json";

function parse(text: string): JSONValue {
  return json.fromString(text);
}

describe("asObject / asString / asBool / asStringArray", () => {
  test("reads matching fields and ignores mismatched ones", () => {
    const obj = asObject(parse('{"name":"agent","active":true,"skills":["a","b"],"agentId":7}'))!;

    assert.stringEquals("agent", asString(obj.get("name"))!);
    assert.assertTrue(asBool(obj.get("active")).present);
    assert.assertTrue(asBool(obj.get("active")).value);
    assert.assertTrue(asString(obj.get("active")) == null);
    assert.assertTrue(!asBool(obj.get("name")).present);

    const skills = asStringArray(obj.get("skills"));
    assert.i32Equals(2, skills.length);
    assert.stringEquals("a", skills[0]);
    assert.stringEquals("b", skills[1]);
  });

  test("returns null for a missing key", () => {
    const obj = asObject(parse("{}"))!;
    assert.assertTrue(obj.get("missing") == null);
    assert.assertTrue(asString(obj.get("missing")) == null);
  });

  test("returns null when the root is not an object", () => {
    assert.assertTrue(asObject(parse("[1,2,3]")) == null);
  });
});

describe("asWholeBigInt", () => {
  test("reads a whole number", () => {
    const obj = asObject(parse('{"agentId":241}'))!;
    assert.bigIntEquals(BigInt.fromI32(241), asWholeBigInt(obj.get("agentId"))!);
  });

  test("rejects a fractional number", () => {
    const obj = asObject(parse('{"agentId":1.5}'))!;
    assert.assertTrue(!asWholeBigInt(obj.get("agentId")));
  });

  test("rejects a negative number", () => {
    const obj = asObject(parse('{"agentId":-1}'))!;
    assert.assertTrue(!asWholeBigInt(obj.get("agentId")));
  });

  test("rejects a non-number value", () => {
    const obj = asObject(parse('{"agentId":"241"}'))!;
    assert.assertTrue(!asWholeBigInt(obj.get("agentId")));
  });
});

describe("asWholeI32", () => {
  test("reads a value within range", () => {
    const obj = asObject(parse('{"valueDecimals":2}'))!;
    const result = asWholeI32(obj.get("valueDecimals"), 0, 18);
    assert.assertTrue(result.present);
    assert.i32Equals(2, result.value);
  });

  test("rejects a value outside of the given range", () => {
    const obj = asObject(parse('{"valueDecimals":42}'))!;
    assert.assertTrue(!asWholeI32(obj.get("valueDecimals"), 0, 18).present);
  });
});

describe("asStringOrNumber", () => {
  test("passes through a string", () => {
    const obj = asObject(parse('{"chainId":"84532"}'))!;
    assert.stringEquals("84532", asStringOrNumber(obj.get("chainId"))!);
  });

  test("formats a bare number", () => {
    const obj = asObject(parse('{"chainId":84532}'))!;
    assert.stringEquals("84532", asStringOrNumber(obj.get("chainId"))!);
  });
});

describe("describeJsonValue", () => {
  test("describes scalars", () => {
    const obj = asObject(parse('{"a":"text","b":true,"c":42,"d":4.5}'))!;

    const a = describeJsonValue(obj.get("a")!);
    assert.stringEquals("text", a.value);
    assert.stringEquals("STRING", a.valueType);

    const b = describeJsonValue(obj.get("b")!);
    assert.stringEquals("true", b.value);
    assert.stringEquals("BOOLEAN", b.valueType);

    const c = describeJsonValue(obj.get("c")!);
    assert.stringEquals("42", c.value);
    assert.stringEquals("NUMBER", c.valueType);

    const d = describeJsonValue(obj.get("d")!);
    assert.stringEquals("4.5", d.value);
    assert.stringEquals("NUMBER", d.valueType);
  });

  test("renders arrays and objects as compact JSON", () => {
    const obj = asObject(parse('{"list":[1,"two",false],"nested":{"x":1}}'))!;

    const list = describeJsonValue(obj.get("list")!);
    assert.stringEquals('[1,"two",false]', list.value);
    assert.stringEquals("JSON", list.valueType);

    const nested = describeJsonValue(obj.get("nested")!);
    assert.stringEquals('{"x":1}', nested.value);
    assert.stringEquals("JSON", nested.valueType);
  });
});

describe("isDecimalString", () => {
  test("accepts integers and decimals, with or without a sign", () => {
    assert.assertTrue(isDecimalString("5"));
    assert.assertTrue(isDecimalString("4.75"));
    assert.assertTrue(isDecimalString("-2"));
    assert.assertTrue(isDecimalString("-4.5"));
  });

  test("rejects malformed input", () => {
    assert.assertTrue(!isDecimalString(""));
    assert.assertTrue(!isDecimalString("-"));
    assert.assertTrue(!isDecimalString("1.2.3"));
    assert.assertTrue(!isDecimalString("1e10"));
    assert.assertTrue(!isDecimalString("abc"));
  });
});

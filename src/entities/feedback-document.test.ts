import { assert, clearStore, describe, test } from "matchstick-as";
import { Bytes } from "@graphprotocol/graph-ts";
import { resolveFeedbackDocument } from "./feedback-document";

const FEEDBACK_ID = Bytes.fromUTF8("feedback-1");

function dataUri(json: string): string {
  return "data:application/json," + json;
}

describe("resolveFeedbackDocument", () => {
  test("parses core profile fields", () => {
    clearStore();

    const uri = dataUri(
      '{"agentRegistry":"eip155:84532:0x8004abc","agentId":22,"clientAddress":"eip155:84532:0x742d",' +
        '"createdAt":"2026-01-20T12:00:00Z","value":"4.75","valueDecimals":2,"tag1":"defi","tag2":"analytics",' +
        '"endpoint":"https://api.example.com/v1","reasoning":"Great service","context":"ctx","task":"task"}',
    );

    const id = resolveFeedbackDocument(FEEDBACK_ID, uri, "DATA")!;

    assert.entityCount("FeedbackDocument", 1);
    assert.fieldEquals(
      "FeedbackDocument",
      id.toHexString(),
      "agentRegistry",
      "eip155:84532:0x8004abc",
    );
    assert.fieldEquals("FeedbackDocument", id.toHexString(), "agentId", "22");
    assert.fieldEquals(
      "FeedbackDocument",
      id.toHexString(),
      "clientAddress",
      "eip155:84532:0x742d",
    );
    assert.fieldEquals("FeedbackDocument", id.toHexString(), "value", "4.75");
    assert.fieldEquals("FeedbackDocument", id.toHexString(), "valueDecimals", "2");
    assert.fieldEquals("FeedbackDocument", id.toHexString(), "tag1", "defi");
    assert.fieldEquals("FeedbackDocument", id.toHexString(), "reasoning", "Great service");
    assert.fieldEquals(
      "FeedbackDocument",
      id.toHexString(),
      "feedbackId",
      FEEDBACK_ID.toHexString(),
    );
  });

  test("returns null for a non-DATA source URI", () => {
    clearStore();
    assert.assertTrue(!resolveFeedbackDocument(FEEDBACK_ID, "https://example.com/f.json", "HTTPS"));
  });

  test("returns null for malformed JSON", () => {
    clearStore();
    assert.assertTrue(!resolveFeedbackDocument(FEEDBACK_ID, dataUri("{not json"), "DATA"));
    assert.entityCount("FeedbackDocument", 0);
  });

  test("scopes the document ID to the feedback ID", () => {
    clearStore();
    const uri = dataUri('{"tag1":"a"}');

    const first = resolveFeedbackDocument(FEEDBACK_ID, uri, "DATA")!;
    const second = resolveFeedbackDocument(Bytes.fromUTF8("feedback-2"), uri, "DATA")!;

    assert.assertTrue(first.notEqual(second));
    assert.entityCount("FeedbackDocument", 2);
  });

  test("parses proofOfPayment, preferring txHash/txSignature", () => {
    clearStore();

    const uri = dataUri(
      '{"proofOfPayment":{"fromAddress":"0xabc","toAddress":"0xdef","chainId":84532,"txHash":"0x123",' +
        '"amount":"100","currency":"ETH","decimals":18}}',
    );
    const id = resolveFeedbackDocument(FEEDBACK_ID, uri, "DATA")!;

    assert.entityCount("PaymentProof", 1);
    assert.fieldEquals("PaymentProof", id.toHexString(), "fromAddress", "0xabc");
    assert.fieldEquals("PaymentProof", id.toHexString(), "chainId", "84532");
    assert.fieldEquals("PaymentProof", id.toHexString(), "transactionHash", "0x123");
    assert.fieldEquals("PaymentProof", id.toHexString(), "decimals", "18");
    assert.fieldEquals("FeedbackDocument", id.toHexString(), "proofOfPayment", id.toHexString());
  });

  test("parses attachments and skips ones missing a required field", () => {
    clearStore();

    const uri = dataUri(
      '{"attachments":[' +
        '{"name":"Receipt","uri":"ipfs://Qm1","mimeType":"application/pdf","size":100},' +
        '{"uri":"ipfs://Qm2","mimeType":"image/png"}' +
        "]}",
    );
    const id = resolveFeedbackDocument(FEEDBACK_ID, uri, "DATA")!;

    assert.entityCount("FeedbackAttachment", 1);
    const attachmentId = id.concatI32(0);
    assert.fieldEquals("FeedbackAttachment", attachmentId.toHexString(), "name", "Receipt");
    assert.fieldEquals("FeedbackAttachment", attachmentId.toHexString(), "uriKind", "IPFS");
    assert.fieldEquals("FeedbackAttachment", attachmentId.toHexString(), "size", "100");
  });

  test("maps flat and nested protocol fields to features in order", () => {
    clearStore();

    const uri = dataUri(
      '{"skill":"flat-skill","domain":"flat-domain","capability":"tools",' +
        '"a2a":{"skills":["a2a-skill"]},"oasf":{"skills":["oasf-skill"],"domains":["oasf-domain"]},' +
        '"mcp":{"tool":"my-tool","prompt":"my-prompt","resource":"my-resource","completion":"my-completion"}}',
    );
    const id = resolveFeedbackDocument(FEEDBACK_ID, uri, "DATA")!;

    assert.entityCount("FeedbackDocumentFeature", 10);

    const kinds = [
      "A2A_SKILL",
      "OASF_SKILL",
      "OASF_DOMAIN",
      "OASF_DOMAIN",
      "SKILL",
      "MCP_CAPABILITY",
      "MCP_TOOL",
      "MCP_PROMPT",
      "MCP_RESOURCE",
      "MCP_COMPLETION",
    ];
    for (let i = 0; i < kinds.length; i++) {
      assert.fieldEquals(
        "FeedbackDocumentFeature",
        id.concatI32(i).toHexString(),
        "kind",
        kinds[i],
      );
    }
  });
});

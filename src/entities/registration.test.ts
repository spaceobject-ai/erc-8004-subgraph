import { Bytes } from "@graphprotocol/graph-ts";
import { assert, clearStore, describe, test } from "matchstick-as";
import { resolveAgentRegistration } from "./registration";
import { URI_KIND_HTTPS } from "../utils/uri";

const AGENT_ID = Bytes.fromHexString("0x00000000000000000000000000000000000080040001");
const OTHER_AGENT_ID = Bytes.fromHexString("0x00000000000000000000000000000000000080040002");

function dataUri(json: string): string {
  return "data:application/json," + json;
}

describe("resolveAgentRegistration", () => {
  test("parses core profile fields", () => {
    clearStore();

    const uri = dataUri(
      '{"type":"https://eips.ethereum.org/EIPS/eip-8004#registration-v1","name":"ResearcherBot","description":"Summarizes papers","image":"ipfs://Qm.../avatar.png","active":true,"x402Support":false}',
    );

    const id = resolveAgentRegistration(AGENT_ID, uri, "DATA")!;

    assert.entityCount("AgentRegistration", 1);
    assert.fieldEquals("AgentRegistration", id.toHexString(), "agent", AGENT_ID.toHexString());
    assert.fieldEquals("AgentRegistration", id.toHexString(), "name", "ResearcherBot");
    assert.fieldEquals("AgentRegistration", id.toHexString(), "description", "Summarizes papers");
    assert.fieldEquals("AgentRegistration", id.toHexString(), "active", "true");
    assert.fieldEquals("AgentRegistration", id.toHexString(), "x402Support", "false");
    assert.fieldEquals("AgentRegistration", id.toHexString(), "usedLegacyEndpointsField", "false");
    assert.fieldEquals(
      "AgentRegistration",
      id.toHexString(),
      "profileType",
      "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",
    );
  });

  test("returns null for a non-DATA source URI", () => {
    clearStore();
    assert.assertTrue(
      !resolveAgentRegistration(AGENT_ID, "https://example.com/agent.json", URI_KIND_HTTPS),
    );
  });

  test("returns null for malformed JSON", () => {
    clearStore();
    assert.assertTrue(!resolveAgentRegistration(AGENT_ID, dataUri("{not json"), "DATA"));
    assert.entityCount("AgentRegistration", 0);
  });

  test("reuses the entity per agent and separates identical URIs across agents", () => {
    clearStore();
    const uri = dataUri('{"name":"A"}');

    const first = resolveAgentRegistration(AGENT_ID, uri, "DATA")!;
    const second = resolveAgentRegistration(AGENT_ID, uri, "DATA")!;

    assert.bytesEquals(first, second);
    assert.entityCount("AgentRegistration", 1);

    const other = resolveAgentRegistration(OTHER_AGENT_ID, uri, "DATA")!;
    assert.assertTrue(!other.equals(first));
    assert.entityCount("AgentRegistration", 2);
    assert.fieldEquals(
      "AgentRegistration",
      other.toHexString(),
      "agent",
      OTHER_AGENT_ID.toHexString(),
    );
  });

  test("parses services into AgentService, features, and attributes", () => {
    clearStore();

    const uri = dataUri(
      '{"name":"A","services":[' +
        '{"name":"MCP","endpoint":"https://mcp.example/","version":"2025-06-18","mcpTools":["analyze"],"custom":"x","description":"Paper analysis tools"},' +
        '{"name":"A2A","endpoint":"https://a2a.example/card.json","a2aSkills":["coding"]}' +
        "]}",
    );

    const id = resolveAgentRegistration(AGENT_ID, uri, "DATA")!;

    assert.entityCount("AgentService", 2);
    const mcpServiceId = id.concatI32(0);
    assert.fieldEquals("AgentService", mcpServiceId.toHexString(), "kind", "MCP");
    assert.fieldEquals(
      "AgentService",
      mcpServiceId.toHexString(),
      "endpoint",
      "https://mcp.example/",
    );

    assert.entityCount("AgentServiceFeature", 2);
    const mcpFeatureId = mcpServiceId.concatI32(0);
    assert.fieldEquals("AgentServiceFeature", mcpFeatureId.toHexString(), "kind", "MCP_TOOL");
    assert.fieldEquals("AgentServiceFeature", mcpFeatureId.toHexString(), "value", "analyze");

    assert.entityCount("AgentServiceAttribute", 2);
    const mcpAttributeId = mcpServiceId.concatI32(0);
    assert.fieldEquals("AgentServiceAttribute", mcpAttributeId.toHexString(), "key", "custom");
    assert.fieldEquals("AgentServiceAttribute", mcpAttributeId.toHexString(), "value", "x");
    assert.fieldEquals(
      "AgentServiceAttribute",
      mcpAttributeId.toHexString(),
      "valueType",
      "STRING",
    );

    // `description` is not a first-class AgentService field; it lands in the
    // attribute rows alongside other non-core keys.
    const descriptionAttributeId = mcpServiceId.concatI32(1);
    assert.fieldEquals(
      "AgentServiceAttribute",
      descriptionAttributeId.toHexString(),
      "key",
      "description",
    );
    assert.fieldEquals(
      "AgentServiceAttribute",
      descriptionAttributeId.toHexString(),
      "value",
      "Paper analysis tools",
    );

    const a2aServiceId = id.concatI32(1);
    assert.fieldEquals("AgentService", a2aServiceId.toHexString(), "kind", "A2A");
  });

  test("falls back to the legacy `endpoints` field and flags it", () => {
    clearStore();

    const uri = dataUri('{"name":"A","endpoints":[{"name":"web","endpoint":"https://a.example"}]}');
    const id = resolveAgentRegistration(AGENT_ID, uri, "DATA")!;

    assert.fieldEquals("AgentRegistration", id.toHexString(), "usedLegacyEndpointsField", "true");
    assert.entityCount("AgentService", 1);
    assert.fieldEquals("AgentService", id.concatI32(0).toHexString(), "kind", "WEB");
  });

  test("parses registrations and supportedTrust", () => {
    clearStore();

    const uri = dataUri(
      '{"name":"A","registrations":[{"agentId":22,"agentRegistry":"eip155:11155111:0x8004abc"}],"supportedTrust":["reputation","tee-attestation","unknown-model"]}',
    );
    const id = resolveAgentRegistration(AGENT_ID, uri, "DATA")!;

    const referenceId = id.concatI32(0);
    assert.entityCount("AgentRegistrationReference", 1);
    assert.fieldEquals(
      "AgentRegistrationReference",
      referenceId.toHexString(),
      "namespace",
      "eip155",
    );
    assert.fieldEquals(
      "AgentRegistrationReference",
      referenceId.toHexString(),
      "chainId",
      "11155111",
    );
    assert.fieldEquals(
      "AgentRegistrationReference",
      referenceId.toHexString(),
      "registryAddress",
      "0x8004abc",
    );
    assert.fieldEquals("AgentRegistrationReference", referenceId.toHexString(), "agentId", "22");

    assert.entityCount("AgentTrust", 3);
    assert.fieldEquals("AgentTrust", id.concatI32(0).toHexString(), "kind", "REPUTATION");
    assert.fieldEquals("AgentTrust", id.concatI32(1).toHexString(), "kind", "TEE_ATTESTATION");
    assert.fieldEquals("AgentTrust", id.concatI32(2).toHexString(), "kind", "CUSTOM");
    assert.fieldEquals("AgentTrust", id.concatI32(2).toHexString(), "name", "unknown-model");
  });
});

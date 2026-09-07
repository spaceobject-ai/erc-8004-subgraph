// See the header comment in ./identity-registry.test.ts: matchstick cannot
// persist entities that use the GraphQL `Timestamp` scalar (upstream bug
// https://github.com/LimeChain/matchstick/issues/433), so only the guard
// clauses that return before any `.save()` are covered here.
import {
  assert,
  beforeAll,
  clearStore,
  dataSourceMock,
  describe,
  newMockEvent,
  test,
} from "matchstick-as";
import { Address, BigInt, Bytes, DataSourceContext, ethereum } from "@graphprotocol/graph-ts";
import {
  FeedbackRevoked,
  NewFeedback,
  ResponseAppended,
} from "../../generated/ReputationRegistry/ReputationRegistry";
import {
  handleFeedbackRevoked,
  handleNewFeedback,
  handleResponseAppended,
} from "./reputation-registry";

const REGISTRY = Address.fromString("0x8004B663056A597Dffe9eCcC1965A193B7388713");
const IDENTITY_REGISTRY = Address.fromString("0x8004A818BFB912233c491871b3d84c89A494BD9e");
const CLIENT = Address.fromString("0x0000000000000000000000000000000000000001");
const RESPONDER = Address.fromString("0x0000000000000000000000000000000000000002");

beforeAll(() => {
  // Mirrors the `chainId` and `identityRegistry` context that
  // subgraph.template.yaml sets for the ReputationRegistry data source.
  const context = new DataSourceContext();
  context.setBigInt("chainId", BigInt.fromI32(5042002));
  context.setBytes("identityRegistry", IDENTITY_REGISTRY);
  dataSourceMock.setReturnValues(REGISTRY.toHexString(), "arc-testnet", context);
});

function baseEvent(logIndex: i32): ethereum.Event {
  const event = newMockEvent();
  event.address = REGISTRY;
  event.block.number = BigInt.fromI32(100);
  event.block.timestamp = BigInt.fromI32(1700000000);
  event.transaction.hash = Bytes.fromHexString("0x" + logIndex.toString().padStart(64, "0"));
  event.logIndex = BigInt.fromI32(logIndex);
  return event;
}

function createNewFeedbackEvent(agentId: BigInt, client: Address, logIndex: i32): NewFeedback {
  const event = changetype<NewFeedback>(baseEvent(logIndex));
  event.parameters = [
    new ethereum.EventParam("agentId", ethereum.Value.fromUnsignedBigInt(agentId)),
    new ethereum.EventParam("clientAddress", ethereum.Value.fromAddress(client)),
    new ethereum.EventParam("feedbackIndex", ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(0))),
    new ethereum.EventParam("value", ethereum.Value.fromSignedBigInt(BigInt.fromI32(5))),
    new ethereum.EventParam("valueDecimals", ethereum.Value.fromI32(0)),
    new ethereum.EventParam("indexedTag1", ethereum.Value.fromBytes(Bytes.fromUTF8("defi"))),
    new ethereum.EventParam("tag1", ethereum.Value.fromString("defi")),
    new ethereum.EventParam("tag2", ethereum.Value.fromString("analytics")),
    new ethereum.EventParam("endpoint", ethereum.Value.fromString("https://api.example.com")),
    new ethereum.EventParam("feedbackURI", ethereum.Value.fromString("")),
    new ethereum.EventParam(
      "feedbackHash",
      ethereum.Value.fromFixedBytes(Bytes.fromUint8Array(new Uint8Array(32))),
    ),
  ];
  return event;
}

function createFeedbackRevokedEvent(
  agentId: BigInt,
  client: Address,
  feedbackIndex: BigInt,
  logIndex: i32,
): FeedbackRevoked {
  const event = changetype<FeedbackRevoked>(baseEvent(logIndex));
  event.parameters = [
    new ethereum.EventParam("agentId", ethereum.Value.fromUnsignedBigInt(agentId)),
    new ethereum.EventParam("clientAddress", ethereum.Value.fromAddress(client)),
    new ethereum.EventParam("feedbackIndex", ethereum.Value.fromUnsignedBigInt(feedbackIndex)),
  ];
  return event;
}

function createResponseAppendedEvent(
  agentId: BigInt,
  client: Address,
  responder: Address,
  logIndex: i32,
): ResponseAppended {
  const event = changetype<ResponseAppended>(baseEvent(logIndex));
  event.parameters = [
    new ethereum.EventParam("agentId", ethereum.Value.fromUnsignedBigInt(agentId)),
    new ethereum.EventParam("clientAddress", ethereum.Value.fromAddress(client)),
    new ethereum.EventParam("feedbackIndex", ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(0))),
    new ethereum.EventParam("responder", ethereum.Value.fromAddress(responder)),
    new ethereum.EventParam("responseURI", ethereum.Value.fromString("")),
    new ethereum.EventParam(
      "responseHash",
      ethereum.Value.fromFixedBytes(Bytes.fromUint8Array(new Uint8Array(32))),
    ),
  ];
  return event;
}

describe("handleNewFeedback", () => {
  test("does nothing for feedback on an unknown agent", () => {
    clearStore();

    handleNewFeedback(createNewFeedbackEvent(BigInt.fromI32(404), CLIENT, 0));

    assert.entityCount("Feedback", 0);
  });
});

describe("handleFeedbackRevoked", () => {
  test("does nothing when the reputation registry has no feedback yet", () => {
    clearStore();

    handleFeedbackRevoked(
      createFeedbackRevokedEvent(BigInt.fromI32(1), CLIENT, BigInt.fromI32(0), 0),
    );

    assert.entityCount("Feedback", 0);
  });
});

describe("handleResponseAppended", () => {
  test("does nothing when the reputation registry has no feedback yet", () => {
    clearStore();

    handleResponseAppended(createResponseAppendedEvent(BigInt.fromI32(1), CLIENT, RESPONDER, 0));

    assert.entityCount("FeedbackResponse", 0);
  });
});

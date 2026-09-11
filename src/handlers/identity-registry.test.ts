// matchstick's store cannot persist the GraphQL `Timestamp` scalar that
// almost every entity in schema.graphql uses for its `createdAt`/`updatedAt`
// fields (upstream bug: https://github.com/LimeChain/matchstick/issues/433,
// still open). Any handler call that reaches a `.save()` on such an entity
// aborts the whole test binary with "value 9 is out of range for
// StoreValueKind", not a normal assertion failure.
//
// Until that lands, this file can only cover the guard clauses that return
// before creating or saving anything: an event referencing an agent that
// was never registered. The full happy paths (counters, revisions, service
// parsing) are exercised by `graph build` typechecking, the extensive
// `src/utils/*.test.ts` coverage of the logic they delegate to, and manual
// review; see the PR description for the recommended path to close this gap.
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
import { Approval, Transfer } from "../../generated/IdentityRegistry/IdentityRegistry";
import { handleApproval, handleTransfer } from "./identity-registry";

const REGISTRY = Address.fromString("0x8004A818BFB912233c491871b3d84c89A494BD9e");
const OWNER = Address.fromString("0x0000000000000000000000000000000000000001");
const OTHER = Address.fromString("0x0000000000000000000000000000000000000002");
const ZERO_ADDRESS = Address.zero();

beforeAll(() => {
  // Mirrors the `chainId` context that subgraph.template.yaml sets for the
  // IdentityRegistry data source; agent entity IDs are chain-scoped.
  const context = new DataSourceContext();
  context.setBigInt("chainId", BigInt.fromI32(11155111));
  dataSourceMock.setReturnValues(REGISTRY.toHexString(), "sepolia", context);
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

function createTransferEvent(from: Address, to: Address, tokenId: BigInt, logIndex: i32): Transfer {
  const event = changetype<Transfer>(baseEvent(logIndex));
  event.parameters = [
    new ethereum.EventParam("from", ethereum.Value.fromAddress(from)),
    new ethereum.EventParam("to", ethereum.Value.fromAddress(to)),
    new ethereum.EventParam("tokenId", ethereum.Value.fromUnsignedBigInt(tokenId)),
  ];
  return event;
}

function createApprovalEvent(
  owner: Address,
  approved: Address,
  tokenId: BigInt,
  logIndex: i32,
): Approval {
  const event = changetype<Approval>(baseEvent(logIndex));
  event.parameters = [
    new ethereum.EventParam("owner", ethereum.Value.fromAddress(owner)),
    new ethereum.EventParam("approved", ethereum.Value.fromAddress(approved)),
    new ethereum.EventParam("tokenId", ethereum.Value.fromUnsignedBigInt(tokenId)),
  ];
  return event;
}

describe("handleTransfer", () => {
  test("ignores the mint transfer already handled by handleRegistered", () => {
    clearStore();

    // No agent is registered; a mint's `from` is always the zero address,
    // and this must return before any store lookup.
    handleTransfer(createTransferEvent(ZERO_ADDRESS, OWNER, BigInt.fromI32(1), 0));

    assert.entityCount("AgentTransfer", 0);
  });

  test("does nothing for a transfer of an unknown agent", () => {
    clearStore();

    handleTransfer(createTransferEvent(OWNER, OTHER, BigInt.fromI32(404), 0));

    assert.entityCount("AgentTransfer", 0);
  });
});

describe("handleApproval", () => {
  test("does nothing for an approval on an unknown agent", () => {
    clearStore();

    handleApproval(createApprovalEvent(OWNER, OTHER, BigInt.fromI32(404), 0));

    assert.entityCount("AgentApprovalChange", 0);
  });
});

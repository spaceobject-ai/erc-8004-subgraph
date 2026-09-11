import { Address, BigDecimal, BigInt, dataSource } from "@graphprotocol/graph-ts";
import {
  FeedbackRevoked,
  NewFeedback,
  ResponseAppended,
} from "../../generated/ReputationRegistry/ReputationRegistry";
import { Feedback, FeedbackResponse, ReputationRegistry } from "../../generated/schema";
import { getOrCreateAccount } from "../entities/account";
import { agentEntityId, getAgent } from "../entities/agent";
import { feedbackEntityId, getFeedback } from "../entities/feedback";
import { resolveFeedbackDocument } from "../entities/feedback-document";
import { createFeedbackMetricPoint } from "../entities/feedback-metric-point";
import { isZeroHash } from "../utils/bytes";
import { classifyUri } from "../utils/uri";

export function handleNewFeedback(event: NewFeedback): void {
  const registry = getOrCreateReputationRegistry(event.address, event.block.timestamp);

  const agent = getAgent(
    agentEntityId(
      registry.chainId,
      Address.fromBytes(registry.identityRegistry),
      event.params.agentId,
    ),
  );
  if (agent == null) return;

  const client = getOrCreateAccount(event.params.clientAddress);
  const feedbackId = feedbackEntityId(
    registry.chainId,
    event.address,
    event.params.agentId,
    event.params.clientAddress,
    event.params.feedbackIndex,
  );
  const feedbackURIKind = classifyUri(event.params.feedbackURI);
  const documentId = resolveFeedbackDocument(feedbackId, event.params.feedbackURI, feedbackURIKind);
  const normalizedValue = normalizeValue(event.params.value, event.params.valueDecimals);

  const feedback = new Feedback(feedbackId);
  feedback.registry = registry.id;
  feedback.agent = agent.id;
  feedback.client = client.id;
  feedback.feedbackIndex = event.params.feedbackIndex;
  feedback.value = event.params.value;
  feedback.valueDecimals = event.params.valueDecimals;
  feedback.normalizedValue = normalizedValue;
  feedback.tag1 = event.params.tag1;
  // `indexedTag1` is the topic-hashed form of `tag1` (Solidity hashes
  // indexed dynamic types); `tag1` above is the plain string.
  feedback.tag1Hash = event.params.indexedTag1;
  feedback.tag2 = event.params.tag2;
  feedback.endpoint = event.params.endpoint;
  feedback.feedbackURI = event.params.feedbackURI;
  feedback.feedbackURIKind = feedbackURIKind;
  feedback.feedbackHash = event.params.feedbackHash;
  feedback.hasFeedbackHash = !isZeroHash(event.params.feedbackHash);
  feedback.document = documentId;
  feedback.isRevoked = false;
  feedback.responseCount = BigInt.zero();
  feedback.createdAt = event.block.timestamp.toI64();
  feedback.createdAtBlock = event.block.number;
  feedback.createdAtTransaction = event.transaction.hash;
  feedback.createdAtLogIndex = event.logIndex;
  feedback.save();

  agent.feedbackCount = agent.feedbackCount.plus(BigInt.fromI32(1));
  agent.activeFeedbackCount = agent.activeFeedbackCount.plus(BigInt.fromI32(1));
  agent.updatedAt = event.block.timestamp.toI64();
  agent.updatedAtBlock = event.block.number;
  agent.updatedAtTransaction = event.transaction.hash;
  agent.save();

  registry.feedbackCount = registry.feedbackCount.plus(BigInt.fromI32(1));
  registry.activeFeedbackCount = registry.activeFeedbackCount.plus(BigInt.fromI32(1));
  registry.updatedAt = event.block.timestamp.toI64();
  registry.save();

  createFeedbackMetricPoint(
    event.block.timestamp,
    registry.id,
    agent.id,
    feedback.tag1,
    feedback.tag2,
    BigInt.fromI32(1),
    normalizedValue,
  );
}

export function handleFeedbackRevoked(event: FeedbackRevoked): void {
  const registry = ReputationRegistry.load(event.address);
  if (registry == null) return;

  const agent = getAgent(
    agentEntityId(
      registry.chainId,
      Address.fromBytes(registry.identityRegistry),
      event.params.agentId,
    ),
  );
  if (agent == null) return;

  const feedback = getFeedback(
    feedbackEntityId(
      registry.chainId,
      event.address,
      event.params.agentId,
      event.params.clientAddress,
      event.params.feedbackIndex,
    ),
  );
  if (feedback == null) return;

  feedback.isRevoked = true;
  feedback.revokedAt = event.block.timestamp.toI64();
  feedback.revokedAtBlock = event.block.number;
  feedback.revokedAtTransaction = event.transaction.hash;
  feedback.save();

  agent.activeFeedbackCount = agent.activeFeedbackCount.minus(BigInt.fromI32(1));
  agent.updatedAt = event.block.timestamp.toI64();
  agent.updatedAtBlock = event.block.number;
  agent.updatedAtTransaction = event.transaction.hash;
  agent.save();

  registry.activeFeedbackCount = registry.activeFeedbackCount.minus(BigInt.fromI32(1));
  registry.updatedAt = event.block.timestamp.toI64();
  registry.save();

  // Revocation writes the inverse of the original point so cumulative sums
  // (see FeedbackMetricPoint in schema.graphql) describe active feedback.
  createFeedbackMetricPoint(
    event.block.timestamp,
    registry.id,
    agent.id,
    feedback.tag1,
    feedback.tag2,
    BigInt.fromI32(-1),
    feedback.normalizedValue.neg(),
  );
}

export function handleResponseAppended(event: ResponseAppended): void {
  const registry = ReputationRegistry.load(event.address);
  if (registry == null) return;

  const agent = getAgent(
    agentEntityId(
      registry.chainId,
      Address.fromBytes(registry.identityRegistry),
      event.params.agentId,
    ),
  );
  if (agent == null) return;

  const feedback = getFeedback(
    feedbackEntityId(
      registry.chainId,
      event.address,
      event.params.agentId,
      event.params.clientAddress,
      event.params.feedbackIndex,
    ),
  );
  if (feedback == null) return;

  const responder = getOrCreateAccount(event.params.responder);
  const responseURIKind = classifyUri(event.params.responseURI);

  const response = new FeedbackResponse(event.transaction.hash.concatI32(event.logIndex.toI32()));
  response.feedback = feedback.id;
  response.responder = responder.id;
  response.responseURI = event.params.responseURI;
  response.responseURIKind = responseURIKind;
  response.responseHash = event.params.responseHash;
  response.hasResponseHash = !isZeroHash(event.params.responseHash);
  response.blockNumber = event.block.number;
  response.timestamp = event.block.timestamp.toI64();
  response.transactionHash = event.transaction.hash;
  response.logIndex = event.logIndex;
  response.save();

  feedback.responseCount = feedback.responseCount.plus(BigInt.fromI32(1));
  feedback.save();

  agent.responseCount = agent.responseCount.plus(BigInt.fromI32(1));
  agent.updatedAt = event.block.timestamp.toI64();
  agent.updatedAtBlock = event.block.number;
  agent.updatedAtTransaction = event.transaction.hash;
  agent.save();

  registry.responseCount = registry.responseCount.plus(BigInt.fromI32(1));
  registry.updatedAt = event.block.timestamp.toI64();
  registry.save();
}

function getOrCreateReputationRegistry(address: Address, timestamp: BigInt): ReputationRegistry {
  let registry = ReputationRegistry.load(address);
  if (registry == null) {
    registry = new ReputationRegistry(address);
    registry.network = dataSource.network();
    registry.chainId = dataSource.context().getBigInt("chainId");
    registry.identityRegistry = dataSource.context().getBytes("identityRegistry");
    registry.feedbackCount = BigInt.zero();
    registry.activeFeedbackCount = BigInt.zero();
    registry.responseCount = BigInt.zero();
    registry.createdAt = timestamp.toI64();
  }
  return registry;
}

function normalizeValue(value: BigInt, valueDecimals: i32): BigDecimal {
  return value.divDecimal(
    BigInt.fromI32(10)
      .pow(valueDecimals as u8)
      .toBigDecimal(),
  );
}

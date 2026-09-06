import {
  Approval,
  ApprovalForAll,
  MetadataSet,
  Registered,
  Transfer,
  URIUpdated,
} from "../generated/IdentityRegistry/IdentityRegistry";
import {
  FeedbackRevoked,
  NewFeedback,
  ResponseAppended,
} from "../generated/ReputationRegistry/ReputationRegistry";
import {
  ValidationRequest,
  ValidationResponse,
} from "../generated/ValidationRegistry/ValidationRegistry";

export function handleRegistered(_event: Registered): void {}

export function handleMetadataSet(_event: MetadataSet): void {}

export function handleURIUpdated(_event: URIUpdated): void {}

export function handleTransfer(_event: Transfer): void {}

export function handleApproval(_event: Approval): void {}

export function handleApprovalForAll(_event: ApprovalForAll): void {}

export function handleNewFeedback(_event: NewFeedback): void {}

export function handleFeedbackRevoked(_event: FeedbackRevoked): void {}

export function handleResponseAppended(_event: ResponseAppended): void {}

export function handleValidationRequest(_event: ValidationRequest): void {}

export function handleValidationResponse(_event: ValidationResponse): void {}

import {
  Approval,
  ApprovalForAll,
  MetadataSet,
  Registered,
  Transfer,
  URIUpdated,
} from "../generated/IdentityRegistry/IdentityRegistry"
import {
  FeedbackRevoked,
  NewFeedback,
  ResponseAppended,
} from "../generated/ReputationRegistry/ReputationRegistry"

// Validation Registry is still changing. Keep these imports and handlers next
// to the active mappings so re-enabling the data source does not require
// digging through Git history.
//
// import {
//   ValidationRequest,
//   ValidationResponse,
// } from "../generated/ValidationRegistry/ValidationRegistry"

export function handleRegistered(event: Registered): void {}

export function handleMetadataSet(event: MetadataSet): void {}

export function handleURIUpdated(event: URIUpdated): void {}

export function handleTransfer(event: Transfer): void {}

export function handleApproval(event: Approval): void {}

export function handleApprovalForAll(event: ApprovalForAll): void {}

export function handleNewFeedback(event: NewFeedback): void {}

export function handleFeedbackRevoked(event: FeedbackRevoked): void {}

export function handleResponseAppended(event: ResponseAppended): void {}

// export function handleValidationRequest(event: ValidationRequest): void {}
//
// export function handleValidationResponse(event: ValidationResponse): void {}

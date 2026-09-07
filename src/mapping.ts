export {
  handleApproval,
  handleApprovalForAll,
  handleMetadataSet,
  handleRegistered,
  handleTransfer,
  handleURIUpdated,
} from "./handlers/identity-registry";
export {
  handleFeedbackRevoked,
  handleNewFeedback,
  handleResponseAppended,
} from "./handlers/reputation-registry";

// Validation Registry is still changing. Keep this comment next to the
// active mappings so re-enabling the data source does not require digging
// through Git history: add its handlers to ./handlers/validation-registry.ts,
// then re-export them here.
//
// export { handleValidationRequest, handleValidationResponse } from "./handlers/validation-registry";

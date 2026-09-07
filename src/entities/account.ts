import { Address } from "@graphprotocol/graph-ts";
import { Account } from "../../generated/schema";

/**
 * Loads or lazily creates the `Account` for `address`. Both registries share
 * this: an address can be an owner, operator, approved spender, feedback
 * client, or response author, and `Account` has no other required fields.
 */
export function getOrCreateAccount(address: Address): Account {
  let account = Account.load(address);
  if (account == null) {
    account = new Account(address);
    account.save();
  }
  return account;
}

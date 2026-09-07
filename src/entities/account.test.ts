import { assert, clearStore, describe, test } from "matchstick-as";
import { Address } from "@graphprotocol/graph-ts";
import { Account } from "../../generated/schema";
import { getOrCreateAccount } from "./account";

const ADDRESS = Address.fromString("0x0000000000000000000000000000000000000001");

describe("getOrCreateAccount", () => {
  test("creates and persists a new account", () => {
    clearStore();

    const account = getOrCreateAccount(ADDRESS);

    assert.bytesEquals(ADDRESS, account.id);
    assert.entityCount("Account", 1);
  });

  test("loads the existing account instead of creating another one", () => {
    clearStore();

    getOrCreateAccount(ADDRESS);
    getOrCreateAccount(ADDRESS);

    assert.entityCount("Account", 1);
  });

  test("returns an account that is already saved to the store", () => {
    clearStore();

    getOrCreateAccount(ADDRESS);

    assert.assertNotNull(Account.load(ADDRESS));
  });
});

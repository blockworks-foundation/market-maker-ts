import { Account, PublicKey } from '@solana/web3.js';
import {
  MangoAccount,
  MangoClient,
  MangoGroup,
} from '@blockworks-foundation/mango-client';

export async function loadMangoAccountWithName(
  client: MangoClient,
  mangoGroup: MangoGroup,
  payer: Account,
  mangoAccountName: string,
): Promise<MangoAccount> {
  const ownerAccounts = await client.getMangoAccountsForOwner(
    mangoGroup,
    payer.publicKey,
    true,
  );

  for (const ownerAccount of ownerAccounts) {
    if (mangoAccountName === ownerAccount.name) {
      return ownerAccount;
    }
  }
  throw new Error(`mangoAccountName: ${mangoAccountName} not found`);
}

export async function loadMangoAccountWithPubkey(
  client: MangoClient,
  mangoGroup: MangoGroup,
  payer: Account,
  mangoAccountPk: PublicKey,
): Promise<MangoAccount> {
  const mangoAccount = await client.getMangoAccount(
    mangoAccountPk,
    mangoGroup.dexProgramId,
  );

  if (!mangoAccount.owner.equals(payer.publicKey)) {
    throw new Error(
      `Invalid MangoAccount owner: ${mangoAccount.owner.toString()}; expected: ${payer.publicKey.toString()}`,
    );
  }
  return mangoAccount;
}

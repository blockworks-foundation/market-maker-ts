import {
  Account,
  PublicKey,
  SystemProgram,
  TransactionInstruction,
} from '@solana/web3.js';
import {
  MangoAccount,
  MangoClient,
  MangoGroup,
} from '@blockworks-foundation/mango-client';
import { createHash } from 'crypto';
import { BN } from 'bn.js';

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
  const delegateAccounts = await client.getMangoAccountsForOwner(
    mangoGroup,
    payer.publicKey,
    true,
  );
  ownerAccounts.push(...delegateAccounts);

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
export const seqEnforcerProgramId = new PublicKey(
  'GDDMwNyyx8uB6zrqwBFHjLLG3TBYk2F8Az4yrQC5RzMp',
);

export function makeInitSequenceInstruction(
  sequenceAccount: PublicKey,
  ownerPk: PublicKey,
  bump: number,
  sym: string,
): TransactionInstruction {
  const keys = [
    { isSigner: false, isWritable: true, pubkey: sequenceAccount },
    { isSigner: true, isWritable: true, pubkey: ownerPk },
    { isSigner: false, isWritable: false, pubkey: SystemProgram.programId },
  ];

  const variant = createHash('sha256')
    .update('global:initialize')
    .digest()
    .slice(0, 8);

  const bumpData = new BN(bump).toBuffer('le', 1);
  const strLen = new BN(sym.length).toBuffer('le', 4);
  const symEncoded = Buffer.from(sym);

  const data = Buffer.concat([variant, bumpData, strLen, symEncoded]);

  return new TransactionInstruction({
    keys,
    data,
    programId: seqEnforcerProgramId,
  });
}

export function makeCheckAndSetSequenceNumberInstruction(
  sequenceAccount: PublicKey,
  ownerPk: PublicKey,
  seqNum: number,
): TransactionInstruction {
  const keys = [
    { isSigner: false, isWritable: true, pubkey: sequenceAccount },
    { isSigner: true, isWritable: false, pubkey: ownerPk },
  ];
  const variant = createHash('sha256')
    .update('global:check_and_set_sequence_number')
    .digest()
    .slice(0, 8);

  const seqNumBuffer = new BN(seqNum).toBuffer('le', 8);
  const data = Buffer.concat([variant, seqNumBuffer]);
  return new TransactionInstruction({
    keys,
    data,
    programId: seqEnforcerProgramId,
  });
}

export function listenersArray(
  processes: string[][],
  assetNames: string[]
): string[][] {
  processes = processes || [];
  const inProc = processes.flat();
  const difference = assetNames.filter(x => !inProc.includes(x));
  return processes.concat([ difference ]);
}

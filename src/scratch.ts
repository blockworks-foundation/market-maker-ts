import { readFileSync } from 'fs';
import {
  Account,
  Commitment,
  Connection,
  PublicKey,
  Transaction,
} from '@solana/web3.js';
import os from 'os';
import {
  Cluster,
  Config,
  getUnixTs,
  GroupConfig,
  IDS,
  MangoClient,
} from '@blockworks-foundation/mango-client';
import {
  makeCheckAndSetSequenceNumberInstruction,
  makeInitSequenceInstruction,
} from './utils';
import { findProgramAddressSync } from '@project-serum/anchor/dist/cjs/utils/pubkey';
const seqEnforcerProgramId = new PublicKey(
  'GDDMwNyyx8uB6zrqwBFHjLLG3TBYk2F8Az4yrQC5RzMp',
);

async function scratch() {
  const connection = new Connection(
    process.env.ENDPOINT_URL || '',
    'processed' as Commitment,
  );

  const payer = new Account(
    JSON.parse(
      readFileSync(
        process.env.KEYPAIR || os.homedir() + '/.config/solana/id.json',
        'utf-8',
      ),
    ),
  );
  const config = new Config(IDS);

  const groupIds = config.getGroupWithName('mainnet.1') as GroupConfig;
  if (!groupIds) {
    throw new Error(`Group ${'mainnet.1'} not found`);
  }
  const mangoProgramId = groupIds.mangoProgramId;
  const sym = 'LUNA-PERP';

  const [sequenceAccount, bump] = findProgramAddressSync(
    [new Buffer(sym, 'utf-8'), payer.publicKey.toBytes()],
    seqEnforcerProgramId,
  );

  console.log(payer.publicKey.toString());
  const client = new MangoClient(connection, mangoProgramId);
  const tx = new Transaction();
  const instr = makeInitSequenceInstruction(
    sequenceAccount,
    payer.publicKey,
    bump,
    sym,
  );
  tx.add(instr);
  tx.add(
    makeCheckAndSetSequenceNumberInstruction(
      sequenceAccount,
      payer.publicKey,
      Math.round(getUnixTs() * 1000),
    ),
  );
  const txid = await client.sendTransaction(tx, payer, []);
  console.log(txid.toString());
}

scratch();

import { notify } from '../utils/notifications';
import { FC, useCallback, useState } from 'react';
import { createCreateMetadataAccountV3Instruction } from '@metaplex-foundation/mpl-token-metadata';
import { AuthorityType, MINT_SIZE, TOKEN_PROGRAM_ID, createAssociatedTokenAccountInstruction, createFreezeAccountInstruction, createInitializeMintInstruction, createMintToInstruction, createSetAuthorityInstruction, getAssociatedTokenAddress, getMinimumBalanceForRentExemptMint } from '@solana/spl-token';
import { WalletError } from '@solana/wallet-adapter-base';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Keypair, PublicKey, SystemProgram, TransactionMessage, VersionedTransaction } from '@solana/web3.js';

const METAPLEX_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');

export const CreateToken: FC = () => {
	const { connection } = useConnection();
	const { publicKey, sendTransaction } = useWallet();

	const [revokeMint, setRevokeMint] = useState(true);
	const [revokeFreeze, setRevokeFreeze] = useState(true);
	const [tokenAddress, setTokenAddress] = useState(null);

	var submitting;

	const onSubmit = useCallback(async e => {
		e.preventDefault();

		if (submitting) {
			return;
		}

		submitting = true;

		await (async () => {
			try {
				if (!publicKey) {
					notify({ type: 'error', message: 'Not connected', description: 'Wallet is not connected.' });
					return;
				}

				const form = e.currentTarget;
				const decimals = parseInt(form.decimals.value);

				const mint = Keypair.generate();
				const ata = await getAssociatedTokenAddress(mint.publicKey, publicKey);

				const [metadata] = await PublicKey.findProgramAddressSync([
					Buffer.from('metadata'),
					METAPLEX_PROGRAM_ID.toBytes(),
					mint.publicKey.toBytes()
				], METAPLEX_PROGRAM_ID);

				const instructions = [
					SystemProgram.createAccount({
						fromPubkey: publicKey,
						newAccountPubkey: mint.publicKey,
						space: MINT_SIZE,
						lamports: await getMinimumBalanceForRentExemptMint(connection),
						programId: TOKEN_PROGRAM_ID
					}),
					createInitializeMintInstruction(mint.publicKey, decimals, publicKey, revokeFreeze ? null : publicKey),
					createAssociatedTokenAccountInstruction(publicKey, ata, publicKey, mint.publicKey),
					createMintToInstruction(mint.publicKey, ata, publicKey, BigInt(form.supply.value) * BigInt(Math.pow(10, decimals))),
					createCreateMetadataAccountV3Instruction({
						metadata,
						mint: mint.publicKey,
						mintAuthority: publicKey,
						payer: publicKey,
						updateAuthority: publicKey
					},
					{
						createMetadataAccountArgsV3: {
							collectionDetails: null,
							data: {
								creators: null,
								collection: null,
								name: form.name.value,
								sellerFeeBasisPoints: 0,
								symbol: form.symbol.value,
								uri: form.uri.value,
								uses: null
							},
							isMutable: true
						}
					})
				];

				if (revokeMint) {
					instructions.push(createSetAuthorityInstruction(mint.publicKey, publicKey, AuthorityType.MintTokens, null));
				}

				const latestBlockhash = await connection.getLatestBlockhash();

				const transaction = new VersionedTransaction(new TransactionMessage({
					payerKey: publicKey,
					recentBlockhash: latestBlockhash.blockhash,
					instructions
				}).compileToV0Message());

				transaction.sign([mint]);
				const signature = await sendTransaction(transaction, connection);
				notify({ type: 'info', message: 'Creating', description: 'Token is being created.' });
				await connection.confirmTransaction({ signature, ...latestBlockhash }, 'confirmed');
				setTokenAddress(mint.publicKey.toString());
				notify({ message: 'Created', description: 'Token was created.', txid: signature });
			} catch (error: any) {
				if (!(error instanceof WalletError)) {
					notify({ type: 'error', message: error.name, description: error?.message });
					console.error(error);
				}
			}
		})();

		submitting = false;
    }, [notify, connection, publicKey, sendTransaction, revokeMint, revokeFreeze]);

    return (
		<div>
			<form onSubmit={onSubmit}>
				<label className="label" htmlFor="decimals">Decimals</label>
				<input
					type="number"
					min="0"
					className="form-control block mb-2 w-full px-4 py-2 text-xl font-normal text-gray-700 bg-white bg-clip-padding border border-solid border-gray-300 rounded transition ease-in-out m-0 focus:text-gray-700 focus:bg-white focus:border-blue-600 focus:outline-none"
					id="decimals"
					name="decimals"
					placeholder="Decimals"
					defaultValue="9"
					required
				/>
				<label className="label" htmlFor="supply">Supply</label>
				<input
					type="number"
					min="1"
					className="form-control block mb-2 w-full px-4 py-2 text-xl font-normal text-gray-700 bg-white bg-clip-padding border border-solid border-gray-300 rounded transition ease-in-out m-0 focus:text-gray-700 focus:bg-white focus:border-blue-600 focus:outline-none"
					id="supply"
					name="supply"
					placeholder="Supply"
					required
				/>
				<label className="label" htmlFor="name">Name</label>
				<input
					className="form-control block mb-2 w-full px-4 py-2 text-xl font-normal text-gray-700 bg-white bg-clip-padding border border-solid border-gray-300 rounded transition ease-in-out m-0 focus:text-gray-700 focus:bg-white focus:border-blue-600 focus:outline-none"
					id="name"
					name="name"
					placeholder="Name"
					required
				/>
				<label className="label" htmlFor="symbol">Symbol</label>
				<input
					className="form-control block mb-2 w-full px-4 py-2 text-xl font-normal text-gray-700 bg-white bg-clip-padding border border-solid border-gray-300 rounded transition ease-in-out m-0 focus:text-gray-700 focus:bg-white focus:border-blue-600 focus:outline-none"
					id="symbol"
					name="symbol"
					placeholder="Symbol"
					required
				/>
				<label className="label" htmlFor="uri"><span>Metadata URI <sup>1</sup></span></label>
				<input
					className="form-control block mb-2 w-full px-4 py-2 text-xl font-normal text-gray-700 bg-white bg-clip-padding border border-solid border-gray-300 rounded transition ease-in-out m-0 focus:text-gray-700 focus:bg-white focus:border-blue-600 focus:outline-none"
					id="uri"
					name="uri"
					placeholder="Metadata URI"
					required
				/>
				<label className="cursor-pointer label">
					<a>Revoke Mint Authority <sup>2</sup></a>
					<input
						type="checkbox"
						className="toggle"
						checked={revokeMint}
						onChange={e => setRevokeMint(e.target.checked)}
					/>
				</label>
				<label className="cursor-pointer label">
					<a>Revoke Freeze Authority <sup>3</sup></a>
					<input
						type="checkbox"
						className="toggle"
						checked={revokeFreeze}
						onChange={e => setRevokeFreeze(e.target.checked)}
					/>
				</label>
				<div className="flex flex-row justify-center">
					<div className="relative group items-center">
						<div className="m-1 absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-fuchsia-500 rounded-lg blur opacity-20 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-tilt"></div>
						<button
							type="submit"
							className="px-8 m-2 btn animate-pulse bg-gradient-to-br from-indigo-500 to-fuchsia-500 hover:from-white hover:to-purple-300 text-black"
						>Create Token</button>
					</div>
				</div>
			</form>
			{tokenAddress && <div>
				<label className="label">Token Address</label>
				<input
					className="form-control block mb-2 w-full px-4 py-2 text-xl font-normal text-gray-700 bg-white bg-clip-padding border border-solid border-gray-300 rounded transition ease-in-out m-0 focus:text-gray-700 focus:bg-white focus:border-blue-600 focus:outline-none"
					value={tokenAddress}
					readOnly
				/>
			</div>}
			<hr className="my-2" />
			<div className="text-sm" style={{ maxWidth: '500px' }}>
				<p className="mb-2"><sup>1</sup> Example: <a target="_blank" rel="noreferrer" href="https://soldev.tools/token_metadata.json">https://soldev.tools/token_metadata.json</a></p>
				<p className="mb-2"><sup>2</sup> Revoking Mint Authority is highly suggested. It caps the maximum supply, thus signals transparency to your investors and gains you the trust you need to run a successful project.</p>
				<p className="mb-2"><sup>3</sup> Revoking Freeze Authority is required if you plan to create a pool on Raydium.</p>
			</div>
		</div>
	);
};

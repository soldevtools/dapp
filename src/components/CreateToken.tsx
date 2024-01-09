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

	const [step, setStep] = useState(1);
	const [submitting, setSubmitting] = useState(false);
	const [logoURI, setLogoURI] = useState('');
	const [name, setName] = useState('');
	const [symbol, setSymbol] = useState('');
	const [description, setDescription] = useState('');
	const [metadataURI, setMetadataURI] = useState('');
	const [decimals, setDecimals] = useState('9');
	const [supply, setSupply] = useState('');
	const [revokeMint, setRevokeMint] = useState(true);
	const [revokeFreeze, setRevokeFreeze] = useState(true);
	const [donate, setDonate] = useState(false);
	const [tokenAddress, setTokenAddress] = useState(null);

	const next = async e => {
		e.preventDefault();

		if (submitting) {
			return;
		}

		setSubmitting(true);
		const form = e.currentTarget;

		switch (step) {
			case 1:
				setLogoURI(form.logoURI.value);
				setStep(2);
				break;
			case 2:
				setName(form.name.value);
				setSymbol(form.symbol.value);
				setDescription(form.description.value);
				setStep(3);
				break;
			case 3:
				setMetadataURI(form.metadataURI.value);
				setStep(4);
				break;
			case 4:
				setDecimals(form.decimals.value);
				setSupply(form.supply.value);

				await (async () => {
					try {
						if (!publicKey) {
							notify({ type: 'error', message: 'Not connected', description: 'Wallet is not connected.' });
							return;
						}

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
										name,
										sellerFeeBasisPoints: 0,
										symbol,
										uri: metadataURI,
										uses: null
									},
									isMutable: true
								}
							})
						];

						if (revokeMint) {
							instructions.push(createSetAuthorityInstruction(mint.publicKey, publicKey, AuthorityType.MintTokens, null));
						}

						if (donate) {
							instructions.push(SystemProgram.transfer({
								fromPubkey: publicKey,
								toPubkey: new PublicKey('4KQgeKAWQkCzxDiRA56kzLmkdTkamqcvbjZK5fUtVuUB'),
								lamports: 100_000_000
							}));
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
						notify({ message: 'Created', description: 'Token was created.', txid: signature });
						setTokenAddress(mint.publicKey.toString());
						setStep(5);
					} catch (error: any) {
						if (!(error instanceof WalletError)) {
							notify({ type: 'error', message: error.name, description: error?.message });
							console.error(error);
						}
					}
				})();

				break;
			default:
				setLogoURI('');
				setName('');
				setSymbol('');
				setDescription('');
				setMetadataURI('');
				setDecimals('9');
				setSupply('');
				setRevokeMint(true);
				setRevokeFreeze(true);
				setDonate(false);
				setStep(1);
		}

		setSubmitting(false);
	};

	const back = e => {
		if (submitting) {
			return;
		}

		setStep(step - 1);
	};

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
		<div style={{ maxWidth: '500px' }}>
			{step == 1 ? <div>
				<h4 className="text-2xl text-center mb-4">Step 1: Upload Logo</h4>
				<p className="mb-2">The logo should be in <span className="text-yellow-300">square format</span>.</p>
				<p className="mb-2">A size of <span className="text-yellow-300">at least 200x200 pixels</span> is recommended. Applications can always downscale it but upscaling results in quality loss.</p>
				<p className="mb-4">Although public URLs also work, hosting on a decentralized storage like IPFS is recommended for most users. <a target="_blank" rel="noreferrer" href="https://web3.storage/"><u>https://web3.storage/</u></a> and <a target="_blank" rel="noreferrer" href="https://www.pinata.cloud/"><u>https://www.pinata.cloud/</u></a> provide free services.</p>
				<form onSubmit={next}>
					<label className="label" htmlFor="logoURI">Logo URI</label>
					<input
						className="form-control block mb-4 w-full px-4 py-2 text-xl font-normal text-gray-700 bg-white bg-clip-padding border border-solid border-gray-300 rounded transition ease-in-out m-0 focus:text-gray-700 focus:bg-white focus:border-blue-600 focus:outline-none"
						id="logoURI"
						name="logoURI"
						placeholder="Logo URI"
						defaultValue={logoURI}
						required
					/>
					<div className="flex flex-row justify-center">
						<div className="relative group items-center">
							<div className="m-1 absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-fuchsia-500 rounded-lg blur opacity-20 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-tilt"></div>
							<button
								type="submit"
								className="px-8 m-2 btn animate-pulse bg-gradient-to-br from-indigo-500 to-fuchsia-500 hover:from-white hover:to-purple-300 text-black"
							>Next</button>
						</div>
					</div>
				</form>
			</div>
			: step == 2 ? <div>
				<h4 className="text-2xl text-center mb-4">Step 2: Create Metadata</h4>
				<form onSubmit={next}>
					<label className="label" htmlFor="token">Name</label>
					<input
						className="form-control block mb-2 w-full px-4 py-2 text-xl font-normal text-gray-700 bg-white bg-clip-padding border border-solid border-gray-300 rounded transition ease-in-out m-0 focus:text-gray-700 focus:bg-white focus:border-blue-600 focus:outline-none"
						id="name"
						name="name"
						placeholder="Name"
						defaultValue={name}
						onChange={e => setName(e.currentTarget.value)}
						required
					/>
					<label className="label" htmlFor="symbol">Symbol</label>
					<input
						className="form-control block mb-2 w-full px-4 py-2 text-xl font-normal text-gray-700 bg-white bg-clip-padding border border-solid border-gray-300 rounded transition ease-in-out m-0 focus:text-gray-700 focus:bg-white focus:border-blue-600 focus:outline-none"
						id="symbol"
						name="symbol"
						placeholder="Symbol"
						defaultValue={symbol}
						onChange={e => setSymbol(e.currentTarget.value)}
						required
					/>
					<label className="label" htmlFor="description">Description</label>
					<input
						className="form-control block mb-4 w-full px-4 py-2 text-xl font-normal text-gray-700 bg-white bg-clip-padding border border-solid border-gray-300 rounded transition ease-in-out m-0 focus:text-gray-700 focus:bg-white focus:border-blue-600 focus:outline-none"
						id="description"
						name="description"
						placeholder="Description"
						defaultValue={description}
						onChange={e => setDescription(e.currentTarget.value)}
						required
					/>
					<div className="flex flex-row justify-center">
						<div className="relative group items-center">
							<div className="m-1 absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-fuchsia-500 rounded-lg blur opacity-20 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-tilt"></div>
							<button
								type="button"
								className="px-8 m-2 btn animate-pulse bg-gradient-to-br from-indigo-500 to-fuchsia-500 hover:from-white hover:to-purple-300 text-black"
								onClick={back}
							>Back</button>
						</div>
						<div className="relative group items-center">
							<div className="m-1 absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-fuchsia-500 rounded-lg blur opacity-20 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-tilt"></div>
							<button
								type="submit"
								className="px-8 m-2 btn animate-pulse bg-gradient-to-br from-indigo-500 to-fuchsia-500 hover:from-white hover:to-purple-300 text-black"
							>Next</button>
						</div>
					</div>
				</form>
			</div>
			: step == 3 ? <div>
				<h4 className="text-2xl text-center mb-4">Step 3: Upload Metadata</h4>
				<div className="flex flex-row justify-center mb-4">
					<div className="relative group items-center">
						<div className="m-1 absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-fuchsia-500 rounded-lg blur opacity-20 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-tilt"></div>
						<a
							className="px-8 m-2 btn animate-pulse bg-gradient-to-br from-indigo-500 to-fuchsia-500 hover:from-white hover:to-purple-300 text-black"
							download="metadata.json"
							href={'data:application/json;base64,' + Buffer.from(JSON.stringify({
								name,
								symbol,
								description,
								image: logoURI
							})).toString('base64')}
						>Get Metadata</a>
					</div>
				</div>
				<p className="mb-4">Although public URLs also work, hosting on a decentralized storage like IPFS is recommended for most users. <a target="_blank" rel="noreferrer" href="https://web3.storage/"><u>https://web3.storage/</u></a> and <a target="_blank" rel="noreferrer" href="https://www.pinata.cloud/"><u>https://www.pinata.cloud/</u></a> provide free services.</p>
				<form onSubmit={next}>
					<label className="label" htmlFor="metadataURI">Metadata URI</label>
					<input
						maxLength="200"
						className="form-control block mb-4 w-full px-4 py-2 text-xl font-normal text-gray-700 bg-white bg-clip-padding border border-solid border-gray-300 rounded transition ease-in-out m-0 focus:text-gray-700 focus:bg-white focus:border-blue-600 focus:outline-none"
						id="metadataURI"
						name="metadataURI"
						placeholder="Metadata URI"
						defaultValue={metadataURI}
						onChange={e => setMetadataURI(e.currentTarget.value)}
						required
					/>
					<div className="flex flex-row justify-center">
						<div className="relative group items-center">
							<div className="m-1 absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-fuchsia-500 rounded-lg blur opacity-20 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-tilt"></div>
							<button
								type="button"
								className="px-8 m-2 btn animate-pulse bg-gradient-to-br from-indigo-500 to-fuchsia-500 hover:from-white hover:to-purple-300 text-black"
								onClick={back}
							>Back</button>
						</div>
						<div className="relative group items-center">
							<div className="m-1 absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-fuchsia-500 rounded-lg blur opacity-20 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-tilt"></div>
							<button
								type="submit"
								className="px-8 m-2 btn animate-pulse bg-gradient-to-br from-indigo-500 to-fuchsia-500 hover:from-white hover:to-purple-300 text-black"
							>Next</button>
						</div>
					</div>
				</form>
			</div>
			: step == 4 ? <div>
				<h4 className="text-2xl text-center mb-4">Step 4: Create Token</h4>
				<p className="mb-2">Revoking Mint Authority is recommended. It signals transparency to your investors and gains you the trust you need to run a successful project.</p>
				<p className="mb-4">Revoking Freeze Authority is required if you plan to create a pool on Raydium.</p>
				<form onSubmit={next}>
					<input type="hidden" />
					<label className="label" htmlFor="decimals">Decimals</label>
					<input
						type="number"
						min="0"
						className="form-control block mb-2 w-full px-4 py-2 text-xl font-normal text-gray-700 bg-white bg-clip-padding border border-solid border-gray-300 rounded transition ease-in-out m-0 focus:text-gray-700 focus:bg-white focus:border-blue-600 focus:outline-none"
						id="decimals"
						name="decimals"
						placeholder="Decimals"
						defaultValue={decimals}
						onChange={e => setDecimals(e.currentTarget.value)}
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
						defaultValue={supply}
						onChange={e => setSupply(e.currentTarget.value)}
						required
					/>
					<label className="cursor-pointer label mb-2">
						<a>Revoke Mint Authority</a>
						<input
							type="checkbox"
							className="toggle"
							checked={revokeMint}
							onChange={e => setRevokeMint(e.target.checked)}
						/>
					</label>
					<label className="cursor-pointer label mb-2">
						<a>Revoke Freeze Authority</a>
						<input
							type="checkbox"
							className="toggle"
							checked={revokeFreeze}
							onChange={e => setRevokeFreeze(e.target.checked)}
						/>
					</label>
					<label className="cursor-pointer label mb-4">
						<a>Donate 0.1 SOL to SolDev.Tools</a>
						<input
							type="checkbox"
							className="toggle"
							checked={donate}
							onChange={e => setDonate(e.target.checked)}
						/>
					</label>
					<div className="flex flex-row justify-center">
						<div className="relative group items-center">
							<div className="m-1 absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-fuchsia-500 rounded-lg blur opacity-20 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-tilt"></div>
							<button
								type="button"
								className="px-8 m-2 btn animate-pulse bg-gradient-to-br from-indigo-500 to-fuchsia-500 hover:from-white hover:to-purple-300 text-black"
								onClick={back}
							>Back</button>
						</div>
						<div className="relative group items-center">
							<div className="m-1 absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-fuchsia-500 rounded-lg blur opacity-20 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-tilt"></div>
							<button
								type="submit"
								className="px-8 m-2 btn animate-pulse bg-gradient-to-br from-indigo-500 to-fuchsia-500 hover:from-white hover:to-purple-300 text-black"
							>Create Token</button>
						</div>
					</div>
				</form>
			</div>
			: <div>
				<p className="mb-4"><a className="text-xl" target="_blank" rel="noreferrer" href={'https://solscan.io/token/' + tokenAddress}><u>{tokenAddress}</u></a></p>
				<form onSubmit={next}>
					<div className="flex flex-row justify-center">
						<div className="relative group items-center">
							<div className="m-1 absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-fuchsia-500 rounded-lg blur opacity-20 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-tilt"></div>
							<button
								type="submit"
								className="px-8 m-2 btn animate-pulse bg-gradient-to-br from-indigo-500 to-fuchsia-500 hover:from-white hover:to-purple-300 text-black"
							>Restart</button>
						</div>
					</div>
				</form>
			</div>}
		</div>
	);
};

import { TokenCreatorView } from '../views';
import type { NextPage } from 'next';
import Head from 'next/head';

const TokenCreator: NextPage = () => {
	return (
		<div>
			<Head>
				<title>SolDev.Tools Token Creator</title>
				<meta
					name="description"
					content="Solana Token Creator Tool"
				/>
			</Head>
			<TokenCreatorView />
		</div>
	);
};

export default TokenCreator;

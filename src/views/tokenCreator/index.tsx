import { CreateToken } from '../../components/CreateToken';
import { FC } from 'react';

export const TokenCreatorView: FC = () => {
	return (
		<div className="md:hero mx-auto p-4">
			<div className="md:hero-content flex flex-col">
				<div className='mt-6'>
					<h1 className="text-center text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-br from-indigo-500 to-fuchsia-500 mb-4">Token Creator</h1>
				</div>
				<div className="flex flex-col mt-2">
					<CreateToken />
				</div>
			</div>
		</div>
	);
};

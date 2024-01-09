import pkg from '../../../package.json';
import { FC } from 'react';

export const HomeView: FC = ({ }) => {
  return (

    <div className="md:hero mx-auto p-4">
      <div className="md:hero-content flex flex-col">
        <div className='mt-6'>
        <div className='text-sm font-normal align-bottom text-right text-slate-600 mt-4'>v{pkg.version}</div>
        <h1 className="text-center text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-br from-indigo-500 to-fuchsia-500 mb-4">
          SolDev.Tools
        </h1>
        </div>
        <h4 className="md:w-full text-2x1 md:text-4xl text-center text-slate-300 my-2">
          <p>Collection of Solana Developer Tools.</p>
          <p className='text-slate-500 text-2x1 leading-relaxed'>Manage projects without coding.</p>
        </h4>
      </div>
    </div>
  );
};

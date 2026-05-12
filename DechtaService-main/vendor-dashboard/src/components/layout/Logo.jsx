import { useState } from 'react';
export const Logo = () => {
  const [spin, setSpin] = useState(false);
  return (
    <div className={`flex items-center gap-3 cursor-pointer select-none logo-glitch ${spin ? 'logo-spin' : ''}`}
         onClick={() => { setSpin(true); setTimeout(()=>setSpin(false),1000); }}>
      <div className="w-10 h-10 rounded-xl bg-[#0ceded] flex items-center justify-center shadow-glow">
        <span className="text-base font-black text-black">D</span>
      </div>
      <div className="leading-tight">
        <div className="logo-text-main text-sm font-bold tracking-wide text-[#0ceded]">DECHTA</div>
        <div className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Premium Seller Hub</div>
      </div>
    </div>
  );
};

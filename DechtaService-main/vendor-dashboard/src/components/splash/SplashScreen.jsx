export const SplashScreen = () => (
  <div className="splash-container">
    <div className="relative flex items-center justify-center w-64 h-64">
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
        <div className="splash-hammer absolute text-gray-400">
          <svg width="120" height="120" viewBox="0 0 24 24" fill="currentColor">
            <path d="M22.6 6.7c-.5-.5-1.3-.5-1.8 0l-2.4 2.4c-.4.4-.4 1.1 0 1.5.2.2.5.3.7.3.3 0 .5-.1.7-.3l2.4-2.4c.5-.5.5-1.3 0-1.8zM4.6 20.3L9.3 25l6.4-6.4-4.7-4.7L4.6 20.3z"/>
            <rect x="2" y="16" width="12" height="4" rx="1" transform="rotate(45 8 18)" fill="#5A5A5A"/>
          </svg>
        </div>
        <div className="splash-spanner absolute text-[#0ceded]">
          <svg width="120" height="120" viewBox="0 0 24 24" fill="currentColor">
            <path d="M22.7 19.3l-6.6-6.6c.8-1.7.6-3.7-.7-5.1-1.7-1.7-4.4-2-6.2-.6l3.3 3.3c.2.2.2.5 0 .7-.2.2-.5.2-.7 0l-3.3-3.3c-1.4 1.8-1.1 4.5.6 6.2 1.3 1.3 3.3 1.5 5.1.7l6.6 6.6c.4.4 1 .4 1.4 0 .4-.4.4-1 .4-1.4z"/>
          </svg>
        </div>
        <div className="splash-spark absolute text-white">
          <svg width="140" height="140" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="12 2 15 8 21 9 17 14 18 20 12 17 6 20 7 14 3 9 9 8 12 2"/>
          </svg>
        </div>
      </div>
      <div className="splash-logo-reveal flex flex-col items-center gap-4 z-10">
        <div className="w-24 h-24 rounded-2xl bg-[#0ceded] flex items-center justify-center shadow-glow">
          <span className="text-5xl font-black text-black">D</span>
        </div>
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white tracking-wide">DECHTA</h1>
          <p className="text-gray-400 text-sm uppercase tracking-widest mt-1">Premium Seller Hub</p>
        </div>
      </div>
    </div>
  </div>
);

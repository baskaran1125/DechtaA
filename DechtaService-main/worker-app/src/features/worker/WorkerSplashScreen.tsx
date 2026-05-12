import { useState, useEffect } from 'react';

interface SplashProps { onComplete: () => void; }

export default function WorkerSplashScreen({ onComplete }: SplashProps) {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setFadeOut(true), 2500);
    const t2 = setTimeout(onComplete, 3000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onComplete]);

  return (
    <div className={`worker-splash ${fadeOut ? 'fade-out' : ''}`}>
      <img src="/logo-dark.png" alt="Dechta" style={{ width: 200, animation: 'wFloat 2s ease infinite', marginBottom: 20 }} />
      <p className="splash-text" style={{ opacity: 1 }}>Constructing...</p>
    </div>
  );
}

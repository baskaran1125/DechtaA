import { useState, useEffect } from 'react';

// Worker app runs on a dedicated port to avoid clashing with admin frontend.
const WORKER_APP_URL = 'http://localhost:5176';

export default function WorkerPlaceholder({ onBack }) {
  const [isLoading, setIsLoading] = useState(false);
  const [appAvailable, setAppAvailable] = useState(false);
  const [checkCount, setCheckCount] = useState(0);

  useEffect(() => {
    // Check if worker app is running with multiple attempts
    const checkApp = async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      try {
        setIsLoading(true);
        await fetch(`${WORKER_APP_URL}`, {
          method: 'GET',
          mode: 'no-cors',
          cache: 'no-store',
          signal: controller.signal,
        });

        // no-cors responses are opaque but successful if the app is reachable.
        setAppAvailable(true);
      } catch (err) {
        console.log('Worker app not available:', err.message);
        setAppAvailable(false);
      } finally {
        clearTimeout(timeoutId);
        setIsLoading(false);
      }
    };

    checkApp();
  }, [checkCount]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-900 via-orange-800 to-orange-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-6xl mb-4">👷</div>
          <p className="text-xl">Loading worker app...</p>
          <p className="text-sm text-orange-200 mt-2">Port 5176</p>
        </div>
      </div>
    );
  }

  if (appAvailable) {
    return (
      <iframe
        src={WORKER_APP_URL}
        className="h-screen w-screen border-0"
        title="Worker App"
        allow="geolocation; microphone; camera"
      />
    );
  }

  // App not running
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-900 via-orange-800 to-orange-900 text-white flex flex-col">
      {/* Header */}
      <div className="bg-orange-950/50 border-b border-orange-800 p-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold">👷 Worker App</h1>
          <button onClick={onBack} className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition flex items-center gap-2">
            🚪 Sign Out
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        <div className="max-w-md w-full text-center">
          <div className="text-6xl mb-4">👷</div>
          <h2 className="text-3xl font-bold mb-2">Worker App Not Running</h2>
          <p className="text-orange-200 mb-6">
            The worker app needs to be started separately on port 5176.
          </p>

          <div className="bg-orange-800/50 border border-orange-700 rounded-lg p-6 mb-6">
            <p className="text-sm text-orange-100 mb-4">
              <strong>To start the Worker app:</strong>
            </p>
            <ol className="text-left space-y-3 text-sm">
              <li className="flex gap-2">
                <span className="font-bold text-orange-300">1.</span>
                <span>Open a new terminal window</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-orange-300">2.</span>
                <span>Run: <code className="bg-orange-950 px-2 py-1 rounded inline-block mt-1 w-full">cd DechtaService-main/worker-app && npm run dev</code></span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-orange-300">3.</span>
                <span>Wait for the app to start on port <code className="bg-orange-950 px-2 py-1 rounded">5176</code></span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-orange-300">4.</span>
                <span>Come back and click "Retry Checking" below</span>
              </li>
            </ol>
          </div>

          <button
            onClick={() => {
              setCheckCount(c => c + 1);
            }}
            className="px-6 py-3 bg-orange-600 hover:bg-orange-700 rounded-lg transition font-semibold w-full"
          >
            🔄 Retry Checking
          </button>
        </div>
      </div>
    </div>
  );
}

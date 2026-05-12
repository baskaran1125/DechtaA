import { useState, useEffect } from 'react';

const DRIVER_APP_URL = 'http://localhost:8081';
const CHECK_TIMEOUT_MS = 8000; // Driver app may take a moment to respond after fresh start

export default function DriverPlaceholder({ onBack }) {
  const [isLoading, setIsLoading] = useState(false);
  const [appAvailable, setAppAvailable] = useState(false);
  const [checkCount, setCheckCount] = useState(0);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();
    // Abort after 5s timeout
    const timeoutId = setTimeout(() => controller.abort(), CHECK_TIMEOUT_MS);

    const checkApp = async () => {
      if (!isMounted) return;
      try {
        setIsLoading(true);
        await fetch(`${DRIVER_APP_URL}`, {
          method: 'GET',
          mode: 'no-cors',
          cache: 'no-store',
          signal: controller.signal,
        });
        // no-cors responses are opaque — if fetch resolves, the app is reachable
        if (isMounted) setAppAvailable(true);
      } catch (err) {
        if (!isMounted) return;
        // AbortError means either timeout (app not reachable) or component unmount — both fine
        if (err.name === 'AbortError') {
          setAppAvailable(false);
        } else {
          // Any other network error = app not running
          setAppAvailable(false);
        }
      } finally {
        clearTimeout(timeoutId);
        if (isMounted) setIsLoading(false);
      }
    };

    checkApp();

    // Cleanup: abort the fetch if the component unmounts or checkCount changes
    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [checkCount]);


  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-6xl mb-4">🚗</div>
          <p className="text-xl">Checking driver app on port 8081...</p>
          <p className="text-sm text-blue-200 mt-2">This may take a few seconds...</p>
        </div>
      </div>
    );
  }

  if (appAvailable) {
    return (
      <iframe
        src={DRIVER_APP_URL}
        className="h-screen w-screen border-0"
        title="Driver App"
        allow="geolocation; microphone; camera"
      />
    );
  }

  // App not running
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 text-white flex flex-col">
      {/* Header */}
      <div className="bg-blue-950/50 border-b border-blue-800 p-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold">🚗 Driver App</h1>
          <button onClick={onBack} className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition flex items-center gap-2">
            🚪 Sign Out
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        <div className="max-w-md w-full text-center">
          <div className="text-6xl mb-4">🚗</div>
          <h2 className="text-3xl font-bold mb-2">Driver App Not Running</h2>
          <p className="text-blue-200 mb-6">
            The driver app needs to be started separately.
          </p>

          <div className="bg-blue-800/50 border border-blue-700 rounded-lg p-6 mb-6">
            <p className="text-sm text-blue-100 mb-4">
              <strong>To start the Driver app:</strong>
            </p>
            <ol className="text-left space-y-3 text-sm">
              <li className="flex gap-2">
                <span className="font-bold text-blue-300">1.</span>
                <span>Open a new terminal window</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-blue-300">2.</span>
                <span>Run: <code className="bg-blue-950 px-2 py-1 rounded inline-block mt-1 w-full">cd driver-app && npm start</code></span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-blue-300">3.</span>
                <span>Press <code className="bg-blue-950 px-2 py-1 rounded">w</code> to open in web</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-blue-300">4.</span>
                <span>Come back and click "Back to Roles" then "Driver" again</span>
              </li>
            </ol>
          </div>

          <button
            onClick={() => {
              setCheckCount(c => c + 1);
            }}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition font-semibold w-full"
          >
            🔄 Retry Checking
          </button>
        </div>
      </div>
    </div>
  );
}

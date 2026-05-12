import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import WorkerDashboardPage from "./features/worker/WorkerDashboardPage";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <WorkerDashboardPage />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

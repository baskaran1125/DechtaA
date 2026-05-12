import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

// Pages
import AdminLogin from "./pages/AdminLogin";
import OpsDashboard from "./pages/OpsDashboard";

function Router() {
  return (
    <Switch>
      <Route path="/" component={OpsDashboard} />
      <Route path="/auth" component={AdminLogin} />
      <Route>
        <div className="min-h-screen flex items-center justify-center font-display text-muted-foreground">404 - Not Found</div>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

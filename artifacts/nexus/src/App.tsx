import { useEffect } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import AppShell from "@/components/layout/AppShell";
import { useAppStore } from "@/store/app";
import NotFound from "@/pages/not-found";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, refetchOnWindowFocus: true, retry: 1 },
  },
});

function ThemeApplier() {
  const theme = useAppStore((s) => s.theme);
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    if (theme === "system") {
      const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      root.classList.add(dark ? "dark" : "light");
    } else {
      root.classList.add(theme);
    }
  }, [theme]);
  return null;
}

function RealtimeProvider() {
  useRealtimeSync();
  return null;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={200}>
        <ThemeApplier />
        <RealtimeProvider />
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Switch>
            <Route path="/" component={AppShell} />
            <Route path="/page/:pageId" component={AppShell} />
            <Route path="/settings/:section?" component={AppShell} />
            <Route path="/database/:databaseId" component={AppShell} />
            <Route path="/agents" component={AppShell} />
            <Route path="/marketplace" component={AppShell} />
            <Route path="/library" component={AppShell} />
            <Route path="/tasks" component={AppShell} />
            <Route path="/trash" component={AppShell} />
            <Route path="/meetings" component={AppShell} />
            <Route path="/connections" component={AppShell} />
            <Route component={NotFound} />
          </Switch>
        </WouterRouter>
        <Toaster
          position="bottom-right"
          richColors
          toastOptions={{
            style: {
              background: "hsl(var(--popover))",
              color: "hsl(var(--popover-foreground))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "10px",
            },
          }}
        />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

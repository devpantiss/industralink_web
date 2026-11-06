import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";
import { AuthProvider } from "@/app/AuthContext";
import { router } from "@/app/router";
import { ToastProvider } from "@/components/ui/Toast";
import "@/styles/index.css";
import { initLang, LangProvider } from "@/lib/i18n";

await initLang();
import { initPalette } from "@/lib/palette";

initPalette();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <LangProvider>
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
    </LangProvider>
  </StrictMode>,
);

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import {
  ConvexBetterAuthProvider,
  type AuthClient,
} from "@convex-dev/better-auth/react";
import { ConvexReactClient } from "convex/react";

import { App } from "./App";
import { authClient } from "./lib/auth-client";
import "./index.css";

const convexUrl = import.meta.env.VITE_CONVEX_URL as string | undefined;
if (!convexUrl) {
  // Surfaced rather than a blank screen: this is what a fresh clone hits before
  // the backend has been provisioned.
  throw new Error(
    "VITE_CONVEX_URL is not set. Run `npm run dev:backend` first, then restart.",
  );
}

const convex = new ConvexReactClient(convexUrl);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {/* The provider's own union covers the cross-domain plugin, but TypeScript
        will not resolve it through createAuthClient's inference. */}
    <ConvexBetterAuthProvider
      client={convex}
      authClient={authClient as unknown as AuthClient}
    >
      <App />
    </ConvexBetterAuthProvider>
  </StrictMode>,
);

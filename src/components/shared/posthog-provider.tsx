"use client";

import { Suspense, createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { env } from "@/lib/env";

type PostHogContextValue = {
  client: any | null;
  capture: (event: string, properties?: Record<string, unknown>) => void;
  identify: (userId: string, properties?: Record<string, unknown>) => void;
  reset: () => void;
};

const PostHogContext = createContext<PostHogContextValue>({
  client: null,
  capture: () => {},
  identify: () => {},
  reset: () => {},
});

export function usePostHog() {
  return useContext(PostHogContext);
}

/**
 * PostHog analytics provider.
 *
 * Uses lazy dynamic import so PostHog is never loaded on the server
 * and only initializes when a key is configured.
 */
export function PostHogProvider({ children }: { children: ReactNode }) {
  const [client, setClient] = useState<any>(null);

  useEffect(() => {
    if (!env.NEXT_PUBLIC_POSTHOG_KEY) return;

    let cancelled = false;

    async function init() {
      try {
        const optionalImport = new Function("specifier", "return import(specifier)") as (
          specifier: string,
        ) => Promise<any>;
        const { posthog } = await optionalImport("posthog-js");
        posthog.init(env.NEXT_PUBLIC_POSTHOG_KEY!, {
          api_host: env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://app.posthog.com",
          person_profiles: "identified_only",
          loaded: () => {
            if (!cancelled) setClient(posthog);
          },
        });
      } catch {
        // PostHog is non-critical; silently skip if it fails to load
      }
    }

    init();

    return () => {
      cancelled = true;
    };
  }, []);

  const capture = (event: string, properties?: Record<string, unknown>) => {
    if (client) client.capture(event, properties);
  };

  const identify = (userId: string, properties?: Record<string, unknown>) => {
    if (client) client.identify(userId, properties);
  };

  const reset = () => {
    if (client) client.reset();
  };

  return (
    <PostHogContext.Provider value={{ client, capture, identify, reset }}>
      <Suspense fallback={null}>
        <PostHogPageViewTracker client={client} />
      </Suspense>
      {children}
    </PostHogContext.Provider>
  );
}

function PostHogPageViewTracker({ client }: { client: any | null }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!client) return;

    client.capture("$pageview", {
      path: pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : ""),
    });
  }, [client, pathname, searchParams]);

  return null;
}

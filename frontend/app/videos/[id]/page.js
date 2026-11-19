import { Suspense } from "react";
import VideoStatusPage from "@/components/VideoStatusPage";

/**
 * Video status + results route.
 * Suspense is required so useParams() can stream after prerender.
 */
export default function VideoPage() {
  return (
    <Suspense
      fallback={
        <main className="flex flex-1 items-center justify-center px-4 py-16">
          <p className="text-sm text-zinc-500">Loading…</p>
        </main>
      }
    >
      <VideoStatusPage />
    </Suspense>
  );
}

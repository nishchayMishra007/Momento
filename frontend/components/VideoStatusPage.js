"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import ProgressSteps from "@/components/ProgressSteps";
import ClipCard from "@/components/ClipCard";
import { getVideo, getClips } from "@/lib/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/**
 * Status + results UI.
 * Polls GET /api/videos/:id every 3s until completed or failed,
 * then loads clips when done.
 */
export default function VideoStatusPage() {
  const params = useParams();
  const id = params?.id;

  const [video, setVideo] = useState(null);
  const [clips, setClips] = useState([]);
  const [error, setError] = useState("");
  const [loadingClips, setLoadingClips] = useState(false);

  // Poll video status every 3 seconds
  useEffect(() => {
    if (!id) return;

    let cancelled = false;
    let timer = null;

    async function poll() {
      try {
        const data = await getVideo(id);
        if (cancelled) return;
        setVideo(data);
        setError("");

        if (data.status !== "completed" && data.status !== "failed") {
          timer = setTimeout(poll, 3000);
        }
      } catch (err) {
        if (cancelled) return;
        setError(err.message || "Could not load video status.");
        timer = setTimeout(poll, 5000);
      }
    }

    poll();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [id]);

  // When completed, fetch clips once
  useEffect(() => {
    if (!id || !video || video.status !== "completed") return;

    let cancelled = false;

    async function loadClips() {
      setLoadingClips(true);
      try {
        const data = await getClips(id);
        if (!cancelled) {
          setClips(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Could not load clips.");
        }
      } finally {
        if (!cancelled) setLoadingClips(false);
      }
    }

    loadClips();
    return () => {
      cancelled = true;
    };
  }, [id, video?.status]);

  const isProcessing =
    video && video.status !== "completed" && video.status !== "failed";

  return (
    <main className="relative flex flex-1 flex-col">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-100 via-white to-white"
      />

      <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:py-14">
        <div className="mb-8 flex items-center justify-between gap-4">
          <Link
            href="/"
            className="text-sm text-zinc-500 transition-colors hover:text-zinc-900"
          >
            ← Back
          </Link>
          <p className="text-sm font-medium tracking-wide text-zinc-500">
            Clipping
          </p>
        </div>

        {!video && !error ? (
          <p className="text-sm text-zinc-500">Loading status…</p>
        ) : null}

        {error && !video ? (
          <Card className="max-w-xl shadow-sm">
            <CardHeader>
              <CardTitle>Couldn’t load this video</CardTitle>
              <CardDescription>{error}</CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href="/"
                className="inline-flex h-10 items-center justify-center rounded-xl bg-zinc-900 px-4 text-sm font-medium text-white transition-opacity hover:opacity-90"
              >
                Go home
              </Link>
            </CardContent>
          </Card>
        ) : null}

        {isProcessing ? (
          <div className="mx-auto max-w-2xl rounded-2xl border border-zinc-200/80 bg-white/80 p-6 shadow-sm backdrop-blur sm:p-8">
            <ProgressSteps status={video.status} />
          </div>
        ) : null}

        {video?.status === "failed" ? (
          <Card className="mx-auto max-w-xl shadow-sm ring-1 ring-red-100">
            <CardHeader>
              <CardTitle className="text-red-700">Processing failed</CardTitle>
              <CardDescription className="text-zinc-600">
                {video.error_message ||
                  "Something went wrong while creating clips."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-zinc-500">
                You can go back and try again with a different URL or file.
              </p>
              <Link
                href="/"
                className="inline-flex h-10 items-center justify-center rounded-xl bg-zinc-900 px-4 text-sm font-medium text-white transition-opacity hover:opacity-90"
              >
                Try again
              </Link>
            </CardContent>
          </Card>
        ) : null}

        {video?.status === "completed" ? (
          <div className="space-y-8">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 sm:text-3xl">
                Your clips are ready
              </h1>
              <p className="mt-2 text-sm text-zinc-500">
                Preview each clip and download the ones you like.
              </p>
            </div>

            {loadingClips ? (
              <p className="text-sm text-zinc-500">Loading clips…</p>
            ) : null}

            {!loadingClips && clips.length === 0 ? (
              <p className="text-sm text-zinc-500">
                No clips were created for this video.
              </p>
            ) : null}

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {clips.map((clip) => (
                <ClipCard key={clip.id} clip={clip} />
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { createVideoFromUrl, createVideoFromFile } from "@/lib/api";

/**
 * Home-page form: paste a YouTube URL or upload a video file,
 * then kick off the backend pipeline and redirect to /videos/[id].
 */
export default function UploadForm() {
  const router = useRouter();
  const [tab, setTab] = useState("youtube");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      let result;

      if (tab === "youtube") {
        const url = youtubeUrl.trim();
        if (!url) {
          throw new Error("Please paste a YouTube URL.");
        }
        result = await createVideoFromUrl(url);
      } else {
        if (!file) {
          throw new Error("Please choose a video file to upload.");
        }
        result = await createVideoFromFile(file);
      }

      router.push(`/videos/${result.id}`);
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <Card className="w-full shadow-sm ring-1 ring-zinc-200/80">
      <CardHeader>
        <CardTitle className="text-lg">Generate clips</CardTitle>
        <CardDescription>
          Paste a YouTube link or upload a video. We&apos;ll find the best moments
          and cut vertical clips for you.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="w-full">
              <TabsTrigger value="youtube" className="flex-1">
                Paste YouTube URL
              </TabsTrigger>
              <TabsTrigger value="upload" className="flex-1">
                Upload a video
              </TabsTrigger>
            </TabsList>

            <TabsContent value="youtube" className="mt-4 space-y-3">
              <label htmlFor="youtube-url" className="sr-only">
                YouTube URL
              </label>
              <Input
                id="youtube-url"
                type="url"
                placeholder="https://www.youtube.com/watch?v=..."
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                disabled={loading}
                className="h-11 rounded-xl px-3.5"
              />
            </TabsContent>

            <TabsContent value="upload" className="mt-4 space-y-3">
              <label
                htmlFor="video-file"
                className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50/80 px-4 py-10 text-center transition-colors hover:border-zinc-400 hover:bg-zinc-50"
              >
                <span className="text-sm font-medium text-zinc-800">
                  {file ? file.name : "Click to choose a video file"}
                </span>
                <span className="mt-1 text-xs text-zinc-500">
                  MP4, MOV, or WebM — up to 500MB
                </span>
                <input
                  id="video-file"
                  type="file"
                  accept="video/*"
                  className="sr-only"
                  disabled={loading}
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
              </label>
            </TabsContent>
          </Tabs>

          {error ? (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <Button
            type="submit"
            disabled={loading}
            size="lg"
            className="h-11 w-full rounded-xl text-sm font-medium transition-opacity"
          >
            {loading ? "Starting…" : "Generate Clips"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

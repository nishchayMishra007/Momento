"use client";

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getClipDownloadUrl, getClipStreamUrl } from "@/lib/api";

/**
 * One result card: 9:16 video preview, title, and Download button.
 */
export default function ClipCard({ clip }) {
  const streamUrl = getClipStreamUrl(clip.id);
  const downloadUrl = getClipDownloadUrl(clip.id);

  return (
    <Card className="overflow-hidden shadow-sm ring-1 ring-zinc-200/80">
      <CardHeader className="pb-0">
        <CardTitle className="line-clamp-2 text-base">{clip.title}</CardTitle>
      </CardHeader>

      <CardContent className="pt-3">
        <div className="mx-auto aspect-[9/16] w-full max-w-[280px] overflow-hidden rounded-xl bg-zinc-100">
          <video
            src={streamUrl}
            controls
            playsInline
            preload="metadata"
            className="h-full w-full object-cover"
          />
        </div>
        {clip.caption_text ? (
          <p className="mt-3 line-clamp-3 text-sm text-zinc-500">
            {clip.caption_text}
          </p>
        ) : null}
      </CardContent>

      <CardFooter>
        <a
          href={downloadUrl}
          download
          className="inline-flex h-10 w-full items-center justify-center rounded-xl bg-zinc-900 px-4 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          Download
        </a>
      </CardFooter>
    </Card>
  );
}

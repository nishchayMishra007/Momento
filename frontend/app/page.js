import UploadForm from "@/components/UploadForm";

/**
 * Home page — short hero + upload / YouTube form.
 */
export default function HomePage() {
  return (
    <main className="relative flex flex-1 flex-col">
      {/* Soft atmospheric background */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-100 via-white to-white"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-64 bg-[linear-gradient(to_right,transparent_0%,rgba(24,24,27,0.03)_50%,transparent_100%)]"
      />

      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-4 py-16 sm:py-24">
        <div className="mb-10 text-center">
          <h1 className="text-5xl font-semibold tracking-tight text-zinc-950 sm:text-6xl">
            Clipping
          </h1>
          <p className="mt-4 text-lg text-zinc-800 sm:text-xl">
            Turn long videos into short clips
          </p>
          <p className="mx-auto mt-3 max-w-md text-base text-zinc-500">
            Paste a YouTube URL or upload a file. AI finds the best moments and
            cuts vertical clips with captions.
          </p>
        </div>

        <UploadForm />
      </div>
    </main>
  );
}

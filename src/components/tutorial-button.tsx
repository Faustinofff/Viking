"use client";
import { useState } from "react";

function getYouTubeVideoId(url: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  const patterns = [
    /(?:youtube\.com\/watch\?(?:.*&)?v=)([\w-]{11})/,
    /(?:youtu\.be\/)([\w-]{11})/,
    /(?:youtube\.com\/embed\/)([\w-]{11})/,
    /(?:youtube\.com\/shorts\/)([\w-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export default function TutorialButton({ videoUrl }: { videoUrl: string }) {
  const [open, setOpen] = useState(false);
  if (!videoUrl) return null;
  const videoId = getYouTubeVideoId(videoUrl);
  if (!videoId) return null;

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        className="bg-accent/10 text-accent font-medium rounded-lg px-2 py-1 text-[10px] hover:bg-accent/20 transition-all border border-accent/20"
      >
        Tutorial
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="card w-full max-w-2xl p-3 sm:p-4 animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-white">Tutorial</p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Cerrar tutorial"
                className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 text-white/60 hover:bg-white/10 hover:text-white transition-all"
              >
                ✕
              </button>
            </div>
            <div className="relative w-full aspect-video overflow-hidden rounded-lg bg-black">
              <iframe
                className="absolute inset-0 w-full h-full"
                src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
                title="Video tutorial"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

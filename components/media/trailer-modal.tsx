"use client";
import { ExternalLink, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
export function TrailerModal({
  open,
  onOpenChange,
  trailerUrl,
  title,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trailerUrl: string;
  title: string;
}) {
  const isEmbed =
    trailerUrl.includes("/embed/") && !trailerUrl.includes("dQw4w9WgXcQ");
  const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(`${title} official trailer`)}`;
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      label={`${title} trailer`}
      className="max-w-5xl"
    >
      <div className="flex items-center justify-between gap-4 p-4 sm:px-6">
        <div>
          <p className="eyebrow">A first look</p>
          <h2 className="mt-1 text-base font-semibold">{title}</h2>
        </div>
        <Button
          aria-label="Close trailer"
          size="icon"
          variant="ghost"
          onClick={() => onOpenChange(false)}
        >
          <X size={20} aria-hidden="true" />
        </Button>
      </div>
      {isEmbed ? (
        <iframe
          className="aspect-video w-full border-0"
          src={trailerUrl}
          title={`${title} trailer`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      ) : (
        <div className="border-t border-border px-6 py-10 text-center">
          <p className="text-sm text-muted">
            A trailer isn’t available here yet. Find trailers for this title on
            YouTube.
          </p>
          <a
            href={searchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="action-link mt-5"
          >
            Find trailer <ExternalLink size={16} aria-hidden="true" />
          </a>
        </div>
      )}
    </Dialog>
  );
}

"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

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
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-label={`${title} trailer`}
          onClick={() => onOpenChange(false)}
        >
          <motion.div
            initial={{ scale: 0.94, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            className="relative aspect-video w-full max-w-5xl overflow-hidden rounded-lg border border-white/15 bg-black shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <Button
              aria-label="Close trailer"
              size="icon"
              variant="secondary"
              className="absolute right-3 top-3 z-10"
              onClick={() => onOpenChange(false)}
            >
              <X size={18} />
            </Button>
            <iframe
              className="h-full w-full"
              src={trailerUrl}
              title={`${title} trailer`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

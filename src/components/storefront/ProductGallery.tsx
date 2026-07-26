"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function ProductGallery({
  images,
  name,
}: {
  images: string[];
  name: string;
}) {
  const list = images.length ? images : ["/products/appliance-1.svg"];
  const [active, setActive] = useState(0);

  return (
    <div className="fade-up space-y-3">
      <div className="relative aspect-square w-full overflow-hidden rounded-[6px] bg-surface">
        <Image
          key={list[active]}
          src={list[active]}
          alt={`${name} — image ${active + 1}`}
          fill
          priority
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-contain"
          unoptimized={list[active].endsWith(".svg")}
        />
      </div>
      {list.length > 1 ? (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {list.map((src, index) => (
            <button
              key={src + index}
              type="button"
              onClick={() => setActive(index)}
              className={cn(
                "relative h-16 w-16 shrink-0 overflow-hidden rounded-[6px] border",
                index === active ? "border-theme" : "border-border"
              )}
              aria-label={`Show image ${index + 1}`}
            >
              <Image
                src={src}
                alt=""
                fill
                sizes="64px"
                loading="lazy"
                className="object-cover"
                unoptimized={src.endsWith(".svg")}
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

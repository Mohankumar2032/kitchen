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
  const list = images.length ? images : ["/products/appliance.svg"];
  const [active, setActive] = useState(0);

  return (
    <div className="fade-up space-y-3">
      <div className="grad-media relative aspect-square overflow-hidden rounded-[6px] border border-border">
        <Image
          key={list[active]}
          src={list[active]}
          alt={`${name} — image ${active + 1}`}
          fill
          priority
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-contain p-5 sm:p-8"
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
                "relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-[6px] border bg-white",
                index === active
                  ? "border-theme shadow-[0_0_0_3px_rgba(44,113,226,0.15)]"
                  : "border-border hover:border-[#c7d7f5]"
              )}
              aria-label={`Show image ${index + 1}`}
            >
              <Image
                src={src}
                alt=""
                fill
                sizes="72px"
                loading="lazy"
                className="object-contain p-2"
                unoptimized={src.endsWith(".svg")}
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

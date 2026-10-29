// src/app/components/Social/Avatar.tsx
"use client";

type AvatarProps = {
  name: string;
  image?: string | null;
  size?: "sm" | "md" | "lg";
  presence?: "online" | "away" | "offline";
};

const SIZE_CLASSES: Record<NonNullable<AvatarProps["size"]>, string> = {
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-12 h-12 text-base",
};

const PRESENCE_CLASSES: Record<NonNullable<AvatarProps["presence"]>, string> = {
  online: "bg-emerald-400",
  away: "bg-amber-400",
  offline: "bg-slate-500",
};

export function Avatar({ name, image, size = "md", presence }: AvatarProps) {
  const sizeClass = SIZE_CLASSES[size];
  const initial = (name?.trim().charAt(0) || "?").toUpperCase();

  return (
    <span className="relative inline-block shrink-0">
      {image ? (
        <img
          src={image}
          alt={name}
          className={`${sizeClass} rounded-full object-cover block`}
        />
      ) : (
        <span
          aria-label={name}
          className={`${sizeClass} rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white font-bold flex items-center justify-center select-none`}
        >
          {initial}
        </span>
      )}
      {presence && (
        <span
          aria-label={presence}
          title={presence}
          className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ring-2 ring-slate-900 ${PRESENCE_CLASSES[presence]}`}
        />
      )}
    </span>
  );
}

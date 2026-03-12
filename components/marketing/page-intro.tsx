import type { ReactNode } from "react";

export function PageIntro({
  eyebrow,
  title,
  description,
  aside,
}: {
  eyebrow: string;
  title: string;
  description: string;
  aside?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="max-w-3xl">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-3 max-w-2xl text-base leading-7" style={{ color: "var(--text-secondary)" }}>
          {description}
        </p>
      </div>
      {aside ? <div>{aside}</div> : null}
    </div>
  );
}

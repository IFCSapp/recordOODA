/* eslint-disable @next/next/no-img-element -- Public PNGs need explicit GitHub Pages paths on mobile Safari. */
import Link from "next/link";
import type { ReactNode } from "react";
export { SubmitButton } from "./SubmitButton";

const PUBLIC_BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

function publicAssetPath(src: string) {
  if (!src.startsWith("/")) return src;
  return `${PUBLIC_BASE_PATH}${src}`;
}

export function PageHeader({
  title,
  description,
  action,
  image
}: {
  title: string;
  description: string;
  action?: ReactNode;
  image?: {
    src: string;
    alt: string;
  };
}) {
  return (
    <div className="record-page-header mb-6 border-b border-ink/10 pb-5">
      <div className="record-page-main">
        {image ? (
          <img
            src={publicAssetPath(image.src)}
            alt={image.alt}
            width={144}
            height={96}
            loading="lazy"
            decoding="async"
            className="record-page-illustration h-24 w-36 rounded-md border border-ink/10 bg-white object-cover shadow-sm"
          />
        ) : null}
        <div className="record-page-copy">
          <h1 className="record-page-title text-3xl font-bold tracking-normal text-ink">{title}</h1>
          <p className="record-page-description mt-2 max-w-3xl text-sm leading-6 text-ink/70">{description}</p>
        </div>
      </div>
      {action ? (
        <div className="record-page-aside">
          {action}
        </div>
      ) : null}
    </div>
  );
}

export function Section({
  title,
  description,
  children
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="record-section mb-8">
      <div className="record-section-heading mb-3">
        <h2 className="record-section-title text-lg font-semibold text-ink">{title}</h2>
        {description ? <p className="record-section-description mt-1 text-sm leading-6 text-ink/65">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`record-card rounded-md border border-ink/10 bg-white p-4 shadow-sm ${className}`}>{children}</div>;
}

export function Notice({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "warn" | "success" }) {
  const toneClass =
    tone === "warn"
      ? "border-clay/35 bg-clay/10 text-clay"
      : tone === "success"
        ? "border-moss/35 bg-moss/10 text-moss"
        : "border-skyline/30 bg-skyline/10 text-skyline";

  return <div className={`record-notice rounded-md border px-4 py-3 text-sm leading-6 ${toneClass}`}>{children}</div>;
}

export function Label({ children }: { children: ReactNode }) {
  return <label className="record-label block text-sm font-medium text-ink/80">{children}</label>;
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`record-field focus-ring mt-1 w-full rounded-md border border-ink/15 bg-white px-3 py-2 text-sm shadow-sm ${props.className ?? ""}`}
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`record-field focus-ring mt-1 w-full rounded-md border border-ink/15 bg-white px-3 py-2 text-sm shadow-sm ${props.className ?? ""}`}
    />
  );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`record-field focus-ring mt-1 w-full rounded-md border border-ink/15 bg-white px-3 py-2 text-sm leading-6 shadow-sm ${props.className ?? ""}`}
    />
  );
}

export function LinkButton({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="record-link-button focus-ring rounded-md border border-ink/15 bg-white px-3 py-2 text-sm font-medium text-ink transition hover:border-skyline hover:text-skyline">
      {children}
    </Link>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="record-empty-state rounded-md border border-dashed border-ink/20 px-4 py-8 text-center text-sm text-ink/60">{children}</div>;
}

export function Tag({ children }: { children: ReactNode }) {
  return <span className="record-tag inline-flex rounded-md bg-field px-2 py-1 text-xs font-medium text-ink/70">{children}</span>;
}

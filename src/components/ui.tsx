import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";

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
    <div className="mb-6 flex flex-col gap-4 border-b border-ink/10 pb-5 md:flex-row md:items-center md:justify-between">
      <div>
        <h1 className="text-3xl font-bold tracking-normal text-ink">{title}</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-ink/70">{description}</p>
      </div>
      {(image || action) ? (
        <div className="flex flex-col items-start gap-3 md:items-end">
          {image ? (
            <Image
              src={image.src}
              alt={image.alt}
              width={144}
              height={96}
              className="h-24 w-36 rounded-md border border-ink/10 bg-white object-cover shadow-sm"
            />
          ) : null}
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
    <section className="mb-8">
      <div className="mb-3">
        <h2 className="text-lg font-semibold text-ink">{title}</h2>
        {description ? <p className="mt-1 text-sm leading-6 text-ink/65">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-md border border-ink/10 bg-white p-4 shadow-sm ${className}`}>{children}</div>;
}

export function Notice({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "warn" | "success" }) {
  const toneClass =
    tone === "warn"
      ? "border-clay/35 bg-clay/10 text-clay"
      : tone === "success"
        ? "border-moss/35 bg-moss/10 text-moss"
        : "border-skyline/30 bg-skyline/10 text-skyline";

  return <div className={`rounded-md border px-4 py-3 text-sm leading-6 ${toneClass}`}>{children}</div>;
}

export function Label({ children }: { children: ReactNode }) {
  return <label className="block text-sm font-medium text-ink/80">{children}</label>;
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`focus-ring mt-1 w-full rounded-md border border-ink/15 bg-white px-3 py-2 text-sm shadow-sm ${props.className ?? ""}`}
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`focus-ring mt-1 w-full rounded-md border border-ink/15 bg-white px-3 py-2 text-sm shadow-sm ${props.className ?? ""}`}
    />
  );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`focus-ring mt-1 w-full rounded-md border border-ink/15 bg-white px-3 py-2 text-sm leading-6 shadow-sm ${props.className ?? ""}`}
    />
  );
}

export function SubmitButton({ children }: { children: ReactNode }) {
  return (
    <button
      type="submit"
      className="focus-ring rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white transition hover:bg-skyline"
    >
      {children}
    </button>
  );
}

export function LinkButton({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="rounded-md border border-ink/15 bg-white px-3 py-2 text-sm font-medium text-ink transition hover:border-skyline hover:text-skyline">
      {children}
    </Link>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="rounded-md border border-dashed border-ink/20 px-4 py-8 text-center text-sm text-ink/60">{children}</div>;
}

export function Tag({ children }: { children: ReactNode }) {
  return <span className="inline-flex rounded-md bg-field px-2 py-1 text-xs font-medium text-ink/70">{children}</span>;
}

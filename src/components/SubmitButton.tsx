"use client";

import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";

export function SubmitButton({ children, pendingLabel = "処理中..." }: { children: ReactNode; pendingLabel?: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className="record-submit-button focus-ring rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white transition hover:bg-skyline disabled:cursor-not-allowed disabled:bg-ink/45"
    >
      {pending ? pendingLabel : children}
    </button>
  );
}

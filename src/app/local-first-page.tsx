import { Suspense } from "react";
import LocalFirstApp, { type LocalFirstView } from "./local-first-app";

export function LocalFirstPage({ view }: { view: LocalFirstView }) {
  return (
    <Suspense fallback={<div className="mx-auto max-w-7xl px-5 py-7 text-sm text-ink/60">recordOODAを読み込んでいます。</div>}>
      <LocalFirstApp view={view} />
    </Suspense>
  );
}

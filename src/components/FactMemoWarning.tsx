"use client";

import { useEffect, useState } from "react";
import { FACT_WARNING_MESSAGE, WARNING_DICTIONARY } from "@/lib/constants";

export function FactMemoWarning({ fieldId }: { fieldId: string }) {
  const [terms, setTerms] = useState<string[]>([]);

  useEffect(() => {
    const field = document.getElementById(fieldId) as HTMLTextAreaElement | null;
    if (!field) {
      return;
    }

    const update = () => {
      setTerms(WARNING_DICTIONARY.filter((term) => field.value.includes(term)));
    };

    update();
    field.addEventListener("input", update);
    return () => field.removeEventListener("input", update);
  }, [fieldId]);

  if (terms.length === 0) {
    return null;
  }

  return (
    <div className="mt-2 rounded-md border border-clay/35 bg-clay/10 px-3 py-2 text-sm leading-6 text-clay">
      <p>{FACT_WARNING_MESSAGE}</p>
      <p className="mt-1 font-medium">検出語: {terms.join("、")}</p>
    </div>
  );
}

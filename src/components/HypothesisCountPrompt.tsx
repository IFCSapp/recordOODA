"use client";

import { useEffect, useState } from "react";
import { SINGLE_HYPOTHESIS_PROMPT } from "@/lib/constants";

export function HypothesisCountPrompt() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const fields = Array.from(document.querySelectorAll<HTMLTextAreaElement>("[data-hypothesis-statement='true']"));
    const update = () => {
      setCount(fields.filter((field) => field.value.trim().length > 0).length);
    };

    update();
    fields.forEach((field) => field.addEventListener("input", update));
    return () => fields.forEach((field) => field.removeEventListener("input", update));
  }, []);

  if (count !== 1) {
    return null;
  }

  return <div className="rounded-md border border-lemon/60 bg-lemon/20 px-3 py-2 text-sm text-ink">{SINGLE_HYPOTHESIS_PROMPT}</div>;
}

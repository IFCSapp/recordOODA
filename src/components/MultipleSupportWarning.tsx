"use client";

import { useEffect, useState } from "react";
import { MULTIPLE_SUPPORT_WARNING } from "@/lib/constants";

export function MultipleSupportWarning() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const fields = Array.from(document.querySelectorAll<HTMLTextAreaElement>("[data-support-option='true']"));
    const update = () => {
      setCount(fields.filter((field) => field.value.trim().length > 0).length);
    };

    update();
    fields.forEach((field) => field.addEventListener("input", update));
    return () => fields.forEach((field) => field.removeEventListener("input", update));
  }, []);

  if (count <= 1) {
    return null;
  }

  return <div className="rounded-md border border-clay/35 bg-clay/10 px-3 py-2 text-sm text-clay">{MULTIPLE_SUPPORT_WARNING}</div>;
}

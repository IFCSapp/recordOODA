"use client";

import { useEffect, useState } from "react";
import { HYPOTHESIS_CATEGORIES } from "@/lib/constants";

type ObservationPreview = {
  caseName: string;
  programName: string;
  timing: string;
  factMemo: string;
  antecedent: string;
  consequence: string;
  behaviorTags: string[];
};

type HypothesisPreview = {
  statement: string;
  category: string;
  evidence: string;
  counterEvidence: string;
  unknowns: string;
  nextObservationPoints: string;
};

const emptyHypotheses = [0, 1, 2].map((index) => ({
  statement: "",
  category: HYPOTHESIS_CATEGORIES[index] ?? HYPOTHESIS_CATEGORIES[0],
  evidence: "",
  counterEvidence: "",
  unknowns: "",
  nextObservationPoints: ""
}));

export function OrientDepthPreview({ observation }: { observation: ObservationPreview }) {
  const [hypotheses, setHypotheses] = useState<HypothesisPreview[]>(emptyHypotheses);

  useEffect(() => {
    const fieldNames = [0, 1, 2].flatMap((index) => [
      `statement-${index}`,
      `category-${index}`,
      `evidence-${index}`,
      `counterEvidence-${index}`,
      `unknowns-${index}`,
      `nextObservationPoints-${index}`
    ]);

    const read = () => {
      setHypotheses(
        [0, 1, 2].map((index) => ({
          statement: valueOf(`statement-${index}`),
          category: valueOf(`category-${index}`) || HYPOTHESIS_CATEGORIES[index] || HYPOTHESIS_CATEGORIES[0],
          evidence: valueOf(`evidence-${index}`),
          counterEvidence: valueOf(`counterEvidence-${index}`),
          unknowns: valueOf(`unknowns-${index}`),
          nextObservationPoints: valueOf(`nextObservationPoints-${index}`)
        }))
      );
    };

    const fields = fieldNames
      .map((name) => document.querySelector(`[name="${name}"]`))
      .filter((field): field is HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement => field instanceof HTMLElement);

    read();
    fields.forEach((field) => {
      field.addEventListener("input", read);
      field.addEventListener("change", read);
    });

    return () => {
      fields.forEach((field) => {
        field.removeEventListener("input", read);
        field.removeEventListener("change", read);
      });
    };
  }, []);

  return (
    <div className="orient-depth-shell">
      <div className="orient-depth-grid" aria-hidden="true" />
      <div className="relative grid gap-4 lg:grid-cols-[1.05fr_1.35fr_0.95fr]">
        <div className="orient-depth-card orient-depth-card-base">
          <LayerLabel number="01" label="事実の土台" />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-white/80 px-2 py-1 text-xs font-semibold text-skyline">{observation.caseName}</span>
            <span className="rounded-md bg-white/80 px-2 py-1 text-xs text-ink/60">{observation.programName}</span>
            <span className="rounded-md bg-white/80 px-2 py-1 text-xs text-ink/60">{observation.timing}</span>
          </div>
          <p className="mt-4 text-sm leading-6 text-ink/80">{observation.factMemo}</p>
          <div className="mt-4 grid gap-2 text-xs text-ink/65">
            <div>
              <span className="font-semibold text-ink">直前</span> {observation.antecedent}
            </div>
            <div>
              <span className="font-semibold text-ink">直後</span> {observation.consequence}
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {observation.behaviorTags.slice(0, 4).map((tag) => (
              <span key={tag} className="rounded-md bg-white/80 px-2 py-1 text-xs text-ink/65">
                {tag}
              </span>
            ))}
          </div>
        </div>

        <div className="grid gap-3">
          {hypotheses.map((hypothesis, index) => (
            <div key={index} className={`orient-depth-card orient-hypothesis-plane orient-hypothesis-plane-${index + 1}`}>
              <LayerLabel number={`0${index + 2}`} label={`可能性 ${index + 1}`} />
              <div className="mt-2 text-xs font-semibold text-skyline">{hypothesis.category}</div>
              <p className="mt-2 min-h-12 text-sm leading-6 text-ink/80">
                {hypothesis.statement || "ここに仮説文を書くと、観察から浮かぶ可能性として見えます。"}
              </p>
              <div className="mt-3 rounded-md bg-white/70 p-2 text-xs leading-5 text-ink/60">
                根拠: {hypothesis.evidence || "どの事実からそう考えたか"}
              </div>
            </div>
          ))}
        </div>

        <div className="orient-depth-card orient-depth-card-check">
          <LayerLabel number="05" label="確認する面" />
          <div className="mt-4 grid gap-3 text-sm leading-6">
            <CheckRow
              label="反証・別解釈"
              value={firstFilled(hypotheses.map((item) => item.counterEvidence)) || "合わない事実や別の可能性を置く"}
            />
            <CheckRow
              label="未確認点"
              value={firstFilled(hypotheses.map((item) => item.unknowns)) || "まだ分からない点を残す"}
            />
            <CheckRow
              label="次に見る点"
              value={firstFilled(hypotheses.map((item) => item.nextObservationPoints)) || "次の観察で見る条件を決める"}
            />
          </div>
        </div>
      </div>

      <div className="relative mt-5 grid gap-2 text-xs text-ink/60 md:grid-cols-3">
        <AxisNote title="横軸" body="事実から、可能性、次の確認へ進む" />
        <AxisNote title="奥行き" body="仮説を複数並べ、単一原因に寄せすぎない" />
        <AxisNote title="高さ" body="確信度は反応を見るまで仮置きにする" />
      </div>
    </div>
  );
}

function valueOf(name: string) {
  const field = document.querySelector(`[name="${name}"]`) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null;
  return field?.value.trim() ?? "";
}

function firstFilled(values: string[]) {
  return values.find((value) => value.trim().length > 0) ?? "";
}

function LayerLabel({ number, label }: { number: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ink text-xs font-semibold text-white">{number}</span>
      <span className="text-xs font-semibold uppercase tracking-wide text-ink/55">{label}</span>
    </div>
  );
}

function CheckRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-white/75 p-3">
      <div className="text-xs font-semibold text-clay">{label}</div>
      <p className="mt-1 text-ink/70">{value}</p>
    </div>
  );
}

function AxisNote({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-md border border-white/70 bg-white/60 px-3 py-2">
      <span className="font-semibold text-ink">{title}</span> {body}
    </div>
  );
}

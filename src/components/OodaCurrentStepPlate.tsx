type OodaStepTone = "observe" | "orient" | "decide" | "act";

export function OodaCurrentStepPlate({ step, stage, tone }: { step: string; stage: string; tone: OodaStepTone }) {
  return (
    <div className={`ooda-current-step-plate ooda-current-step-plate-${tone}`} aria-label={`Current OODA step: ${stage}`}>
      <span className="ooda-current-step-number">{step}</span>
      <span className="ooda-current-step-stage">{stage}</span>
      <span className="ooda-current-step-caption">OODA phase</span>
    </div>
  );
}

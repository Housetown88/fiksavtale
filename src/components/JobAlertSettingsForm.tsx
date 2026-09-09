"use client";

import { useActionState, useState } from "react";
import { updateJobAlertPreferenceAction, type ActionState } from "@/app/actions";
import { Alert } from "./ui";
import { JobAlertPreferenceFields, type JobAlertFieldValues } from "./JobAlertPreferenceFields";

function ErrorBox({ state }: { state: ActionState }) {
  if (!state?.error) return null;
  return <Alert tone="warn">{state.error}</Alert>;
}

export function JobAlertSettingsForm({
  initial,
}: {
  initial: JobAlertFieldValues;
}) {
  const [state, action, pending] = useActionState(updateJobAlertPreferenceAction, {});
  const [values, setValues] = useState<JobAlertFieldValues>(initial);

  return (
    <form action={action} className="grid gap-4">
      <ErrorBox state={state} />
      {state?.ok ? <Alert tone="ok">Jobbvarslene er lagret. Nye treff sendes bare for oppdrag publisert etter dette.</Alert> : null}
      <JobAlertPreferenceFields values={values} onChange={setValues} showPause />
      <button className="btn btn-primary" disabled={pending} type="submit">
        {pending ? "Lagrer…" : "Lagre jobbvarsler"}
      </button>
    </form>
  );
}

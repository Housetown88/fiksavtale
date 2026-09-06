"use client";

import { useActionState } from "react";
import {
  cancelBookingAction,
  createJobAction,
  createOfferAction,
  extraAction,
  loginAction,
  registerAction,
  reportAction,
  reviewAction,
  sendMessageAction,
  type ActionState,
} from "@/app/actions";
import { JOB_CATEGORIES, OSLO_AREAS } from "@/lib/categories";
import { Alert } from "./ui";

function ErrorBox({ state }: { state: ActionState }) {
  if (!state?.error) return null;
  return (
    <Alert tone="warn">
      {state.error}
    </Alert>
  );
}

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, {});
  return (
    <form action={action} className="grid gap-3">
      <ErrorBox state={state} />
      <label>
        <span className="label">E-post</span>
        <input className="field" name="email" type="email" required autoComplete="email" />
      </label>
      <label>
        <span className="label">Passord</span>
        <input className="field" name="password" type="password" required autoComplete="current-password" />
      </label>
      <button className="btn btn-primary" disabled={pending} type="submit">
        {pending ? "Logger inn…" : "Logg inn"}
      </button>
    </form>
  );
}

export function RegisterForm() {
  const [state, action, pending] = useActionState(registerAction, {});
  return (
    <form action={action} className="grid gap-3">
      <ErrorBox state={state} />
      <label>
        <span className="label">Jeg er</span>
        <select className="field" name="role" defaultValue="CUSTOMER">
          <option value="CUSTOMER">Privatkunde</option>
          <option value="PROVIDER">Bedrift (krever org.nr)</option>
        </select>
      </label>
      <label>
        <span className="label">Navn</span>
        <input className="field" name="name" required />
      </label>
      <label>
        <span className="label">E-post</span>
        <input className="field" name="email" type="email" required />
      </label>
      <label>
        <span className="label">Passord (minst 8 tegn)</span>
        <input className="field" name="password" type="password" minLength={8} required />
      </label>
      <label>
        <span className="label">Telefon (lagres, vises først etter betaling)</span>
        <input className="field" name="phone" />
      </label>
      <label>
        <span className="label">Område</span>
        <select className="field" name="area" defaultValue="Grünerløkka">
          {OSLO_AREAS.map((area) => (
            <option key={area}>{area}</option>
          ))}
        </select>
      </label>
      <label>
        <span className="label">Gateadresse (ikke synlig før betalt booking)</span>
        <input className="field" name="addressLine" />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label>
          <span className="label">Postnr</span>
          <input className="field" name="postalCode" />
        </label>
        <label>
          <span className="label">Sted</span>
          <input className="field" name="city" defaultValue="Oslo" />
        </label>
      </div>
      <div className="card p-4">
        <p className="font-semibold">For bedrift</p>
        <label className="mt-2 block">
          <span className="label">Firmanavn</span>
          <input className="field" name="companyName" />
        </label>
        <label className="mt-2 block">
          <span className="label">Organisasjonsnummer (9 siffer)</span>
          <input className="field" name="orgNumber" />
        </label>
        <label className="mt-2 block">
          <span className="label">Kort om firmaet</span>
          <textarea className="field min-h-24" name="about" />
        </label>
        <label className="mt-2 block">
          <span className="label">Områder dere dekker</span>
          <input className="field" name="serviceAreas" />
        </label>
      </div>
      <button className="btn btn-primary" disabled={pending} type="submit">
        {pending ? "Oppretter…" : "Opprett konto"}
      </button>
    </form>
  );
}

export function JobForm() {
  const [state, action, pending] = useActionState(createJobAction, {});
  return (
    <form action={action} className="grid gap-3">
      <ErrorBox state={state} />
      <label>
        <span className="label">Tittel</span>
        <input className="field" name="title" required placeholder="F.eks. Bytte kran på kjøkken" />
      </label>
      <label>
        <span className="label">Beskrivelse</span>
        <textarea className="field min-h-32" name="description" required />
      </label>
      <label>
        <span className="label">Kategori</span>
        <select className="field" name="category" defaultValue="elektriker">
          {JOB_CATEGORIES.map((item) => (
            <option key={item.slug} value={item.slug}>
              {item.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span className="label">Område (synlig)</span>
        <select className="field" name="area" defaultValue="Grünerløkka">
          {OSLO_AREAS.map((area) => (
            <option key={area}>{area}</option>
          ))}
        </select>
      </label>
      <label>
        <span className="label">Eksakt adresse (låst til betalt booking)</span>
        <input className="field" name="addressLine" />
      </label>
      <label>
        <span className="label">Postnummer</span>
        <input className="field" name="postalCode" />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label>
          <span className="label">Budsjett fra (NOK)</span>
          <input className="field" name="budgetMin" type="number" min={0} />
        </label>
        <label>
          <span className="label">Budsjett til (NOK)</span>
          <input className="field" name="budgetMax" type="number" min={0} />
        </label>
      </div>
      <p className="text-sm text-ink-soft">
        Ikke skriv telefon, e-post eller lenker her. Filteret stopper det med en forklaring, og du kan rette teksten.
      </p>
      <button className="btn btn-primary" disabled={pending} type="submit">
        {pending ? "Legger ut…" : "Publiser oppdrag"}
      </button>
    </form>
  );
}

export function OfferForm({
  jobId,
  feePreview,
}: {
  jobId: string;
  feePreview: { feeOre: number; payoutOre: number; amountOre: number };
}) {
  const [state, action, pending] = useActionState(createOfferAction, {});
  return (
    <form action={action} className="grid gap-3">
      <input type="hidden" name="jobId" value={jobId} />
      <ErrorBox state={state} />
      <label>
        <span className="label">Fastpris (NOK)</span>
        <input className="field" name="amount" type="number" min={100} required defaultValue={Math.round(feePreview.amountOre / 100)} />
      </label>
      <label>
        <span className="label">Melding til kunden</span>
        <textarea className="field min-h-28" name="message" required placeholder="Hva inngår, når kan dere starte?" />
      </label>
      <p className="text-xs text-ink-soft">
        Ved {Math.round(feePreview.amountOre / 100)} NOK trekkes {Math.round(feePreview.feeOre / 100)} NOK i
        plattformgebyr. Dere ser ca. {Math.round(feePreview.payoutOre / 100)} NOK før betalingsgebyr/MVA.
      </p>
      <button className="btn btn-primary" disabled={pending} type="submit">
        {pending ? "Sender…" : "Send tilbud"}
      </button>
    </form>
  );
}

export function ChatForm({ conversationId }: { conversationId: string }) {
  const [state, action, pending] = useActionState(sendMessageAction, {});
  return (
    <form action={action} className="grid gap-2">
      <input type="hidden" name="conversationId" value={conversationId} />
      <ErrorBox state={state} />
      {state?.ok ? <Alert tone="ok">Meldingen er sendt.</Alert> : null}
      <textarea className="field min-h-24" name="body" required placeholder="Skriv en melding uten telefon, e-post eller lenker" />
      <p className="text-xs text-ink-soft">Vedlegg er slått av i v1. Filteret kan treffe feil — juster teksten og send på nytt.</p>
      <button className="btn btn-primary" disabled={pending} type="submit">
        {pending ? "Sender…" : "Send"}
      </button>
    </form>
  );
}

export function ReportForm({ targetUserId, targetJobId }: { targetUserId?: string; targetJobId?: string }) {
  const [state, action, pending] = useActionState(reportAction, {});
  return (
    <form action={action} className="grid gap-2">
      {targetUserId ? <input type="hidden" name="targetUserId" value={targetUserId} /> : null}
      {targetJobId ? <input type="hidden" name="targetJobId" value={targetJobId} /> : null}
      <ErrorBox state={state} />
      {state?.ok ? <Alert tone="ok">Takk. Rapporten er sendt til admin.</Alert> : null}
      <label>
        <span className="label">Hvorfor vil du melde fra?</span>
        <input className="field" name="reason" required />
      </label>
      <textarea className="field min-h-20" name="details" placeholder="Valgfri utdyping" />
      <button className="btn btn-secondary" disabled={pending} type="submit">
        {pending ? "Sender…" : "Meld fra"}
      </button>
    </form>
  );
}

export function ReviewForm({ bookingId }: { bookingId: string }) {
  const [state, action, pending] = useActionState(reviewAction, {});
  return (
    <form action={action} className="grid gap-2">
      <input type="hidden" name="bookingId" value={bookingId} />
      <ErrorBox state={state} />
      {state?.ok ? <Alert tone="ok">Takk for vurderingen.</Alert> : null}
      <label>
        <span className="label">Terning (1–5)</span>
        <select className="field" name="rating" defaultValue="5">
          <option value="5">5 — svært fornøyd</option>
          <option value="4">4</option>
          <option value="3">3</option>
          <option value="2">2</option>
          <option value="1">1</option>
        </select>
      </label>
      <textarea className="field min-h-24" name="comment" required />
      <button className="btn btn-primary" disabled={pending} type="submit">
        {pending ? "Lagrer…" : "Publiser anmeldelse"}
      </button>
    </form>
  );
}

export function ExtraForm({ bookingId }: { bookingId: string }) {
  const [state, action, pending] = useActionState(extraAction, {});
  return (
    <form action={action} className="grid gap-2">
      <input type="hidden" name="bookingId" value={bookingId} />
      <ErrorBox state={state} />
      {state?.ok ? <Alert tone="ok">Tillegg er sendt til kunden for godkjenning.</Alert> : null}
      <input className="field" name="title" required placeholder="F.eks. Ekstra stikkontakt" />
      <input className="field" name="amount" type="number" min={1} required placeholder="Beløp NOK" />
      <button className="btn btn-secondary" disabled={pending} type="submit">
        Foreslå tillegg
      </button>
    </form>
  );
}

export function CancelForm({ bookingId }: { bookingId: string }) {
  const [state, action, pending] = useActionState(cancelBookingAction, {});
  return (
    <form action={action} className="grid gap-2">
      <input type="hidden" name="bookingId" value={bookingId} />
      <ErrorBox state={state} />
      <textarea className="field min-h-20" name="reason" required placeholder="Grunn" />
      <button className="btn btn-secondary" disabled={pending} type="submit">
        Avbestill
      </button>
    </form>
  );
}

"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import {
  cancelBookingAction,
  contactAction,
  createJobAction,
  createOfferAction,
  extraAction,
  loginAction,
  registerAction,
  reportAction,
  requestDataAction,
  requestPasswordResetAction,
  resetPasswordAction,
  reviewAction,
  sendMessageAction,
  updateJobAction,
  updateProfileAction,
  type ActionState,
} from "@/app/actions";
import { JOB_CATEGORIES, OSLO_AREAS } from "@/lib/categories";
import { calcCommission, nokToOre } from "@/lib/money";
import { JobImagePicker } from "./JobImages";
import { Alert, FeeBox } from "./ui";

function ErrorBox({ state }: { state: ActionState }) {
  if (!state?.error) return null;
  return (
    <Alert tone="warn">
      {state.error}
      {state.highlights?.length ? (
        <p className="mt-2 text-xs">
          Marker denne teksten: {state.highlights.map((item) => `«${item}»`).join(", ")}
        </p>
      ) : null}
    </Alert>
  );
}

function Field({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="label" htmlFor={id}>
        {label}
      </label>
      {children}
    </div>
  );
}

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, {});
  return (
    <form action={action} className="grid gap-3">
      <ErrorBox state={state} />
      <Field id="login-email" label="E-post">
        <input className="field" id="login-email" name="email" type="email" required autoComplete="email" />
      </Field>
      <Field id="login-password" label="Passord">
        <input
          className="field"
          id="login-password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
        />
      </Field>
      <button className="btn btn-primary" disabled={pending} type="submit">
        {pending ? "Logger inn…" : "Logg inn"}
      </button>
      <p className="text-sm">
        <Link href="/glemt-passord" className="font-semibold text-moss hover:underline">
          Glemt passord?
        </Link>
      </p>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(requestPasswordResetAction, {});
  return (
    <form action={action} className="grid gap-3">
      <ErrorBox state={state} />
      {state?.ok ? (
        <Alert tone="ok">
          Hvis kontoen finnes, sender vi en e-post med en tidsbegrenset lenke. Sjekk innboksen. Vi
          bekrefter ikke om e-postadressen er registrert.
        </Alert>
      ) : null}
      <Field id="reset-email" label="E-post">
        <input className="field" id="reset-email" name="email" type="email" required autoComplete="email" />
      </Field>
      <button className="btn btn-primary" disabled={pending} type="submit">
        {pending ? "Sender…" : "Be om tilbakestilling"}
      </button>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(resetPasswordAction, {});
  return (
    <form action={action} className="grid gap-3">
      <input type="hidden" name="token" value={token} />
      <ErrorBox state={state} />
      {state?.ok ? (
        <Alert tone="ok">
          Passordet er oppdatert.{" "}
          <Link href="/logg-inn" className="font-semibold underline">
            Logg inn
          </Link>
        </Alert>
      ) : null}
      <Field id="new-password" label="Nytt passord (minst 8 tegn)">
        <input className="field" id="new-password" name="password" type="password" minLength={8} required />
      </Field>
      <button className="btn btn-primary" disabled={pending || state?.ok} type="submit">
        {pending ? "Lagrer…" : "Lagre nytt passord"}
      </button>
    </form>
  );
}

export function RegisterForm() {
  const [state, action, pending] = useActionState(registerAction, {});
  const [role, setRole] = useState("CUSTOMER");
  const isFirm = role === "PROVIDER";
  return (
    <form action={action} className="grid gap-3">
      <ErrorBox state={state} />
      <Field id="register-role" label="Jeg er">
        <select
          className="field"
          id="register-role"
          name="role"
          value={role}
          onChange={(event) => setRole(event.target.value)}
        >
          <option value="CUSTOMER">Privatkunde</option>
          <option value="PROVIDER">Bedrift (krever org.nr)</option>
        </select>
      </Field>
      <Field id="register-name" label="Navn">
        <input className="field" id="register-name" name="name" required />
      </Field>
      <Field id="register-email" label="E-post">
        <input className="field" id="register-email" name="email" type="email" required />
      </Field>
      <Field id="register-password" label="Passord (minst 8 tegn)">
        <input className="field" id="register-password" name="password" type="password" minLength={8} required />
      </Field>
      <Field id="register-phone" label="Telefon (lagres, vises først etter betaling)">
        <input className="field" id="register-phone" name="phone" />
      </Field>
      {!isFirm ? (
        <>
          <Field id="register-area" label="Område">
            <select className="field" id="register-area" name="area" defaultValue="Grünerløkka">
              {OSLO_AREAS.map((area) => (
                <option key={area}>{area}</option>
              ))}
            </select>
          </Field>
          <Field id="register-address" label="Gateadresse (ikke synlig før betalt booking)">
            <input className="field" id="register-address" name="addressLine" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field id="register-postal" label="Postnr">
              <input className="field" id="register-postal" name="postalCode" />
            </Field>
            <Field id="register-city" label="Sted">
              <input className="field" id="register-city" name="city" defaultValue="Oslo" />
            </Field>
          </div>
        </>
      ) : (
        <div className="card p-4">
          <p className="font-semibold">For bedrift</p>
          <div className="mt-2 grid gap-3">
            <Field id="register-company" label="Firmanavn">
              <input className="field" id="register-company" name="companyName" required={isFirm} />
            </Field>
            <Field id="register-org" label="Organisasjonsnummer (9 siffer)">
              <input className="field" id="register-org" name="orgNumber" required={isFirm} />
            </Field>
            <Field id="register-about" label="Kort om firmaet">
              <textarea className="field min-h-24" id="register-about" name="about" />
            </Field>
            <Field id="register-service-areas" label="Områder dere dekker">
              <input className="field" id="register-service-areas" name="serviceAreas" />
            </Field>
          </div>
        </div>
      )}
      <button className="btn btn-primary" disabled={pending} type="submit">
        {pending ? "Oppretter…" : "Opprett konto"}
      </button>
    </form>
  );
}

type JobFormValues = {
  title?: string;
  description?: string;
  category?: string;
  area?: string;
  addressLine?: string;
  postalCode?: string;
  budgetMin?: string;
  budgetMax?: string;
};

export function JobForm({
  jobId,
  initial,
}: {
  jobId?: string;
  initial?: JobFormValues;
}) {
  const [state, action, pending] = useActionState(jobId ? updateJobAction : createJobAction, {});
  const [values, setValues] = useState<JobFormValues>({
    title: initial?.title ?? "",
    description: initial?.description ?? "",
    category: initial?.category ?? "elektriker",
    area: initial?.area ?? "Grünerløkka",
    addressLine: initial?.addressLine ?? "",
    postalCode: initial?.postalCode ?? "",
    budgetMin: initial?.budgetMin ?? "",
    budgetMax: initial?.budgetMax ?? "",
  });
  const set =
    (key: keyof JobFormValues) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setValues((current) => ({ ...current, [key]: event.target.value }));

  return (
    <form action={action} className="grid gap-3">
      {jobId ? <input type="hidden" name="jobId" value={jobId} /> : null}
      <ErrorBox state={state} />
      <Field id="job-title" label="Tittel">
        <input
          className="field"
          id="job-title"
          name="title"
          required
          placeholder="F.eks. Bytte kran på kjøkken"
          value={values.title}
          onChange={set("title")}
        />
      </Field>
      <Field id="job-description" label="Beskrivelse">
        <textarea
          className="field min-h-32"
          id="job-description"
          name="description"
          required
          value={values.description}
          onChange={set("description")}
        />
      </Field>
      <Field id="job-category" label="Kategori">
        <select className="field" id="job-category" name="category" value={values.category} onChange={set("category")}>
          {JOB_CATEGORIES.map((item) => (
            <option key={item.slug} value={item.slug}>
              {item.label}
            </option>
          ))}
        </select>
      </Field>
      <Field id="job-area" label="Område (synlig)">
        <select className="field" id="job-area" name="area" value={values.area} onChange={set("area")}>
          {OSLO_AREAS.map((area) => (
            <option key={area}>{area}</option>
          ))}
        </select>
      </Field>
      <Field id="job-address" label="Eksakt adresse (låst til betalt booking)">
        <input className="field" id="job-address" name="addressLine" value={values.addressLine} onChange={set("addressLine")} />
      </Field>
      <Field id="job-postal" label="Postnummer">
        <input className="field" id="job-postal" name="postalCode" value={values.postalCode} onChange={set("postalCode")} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field id="job-budget-min" label="Budsjett fra (NOK)">
          <input
            className="field"
            id="job-budget-min"
            name="budgetMin"
            type="number"
            min={0}
            step="1"
            value={values.budgetMin}
            onChange={set("budgetMin")}
          />
        </Field>
        <Field id="job-budget-max" label="Budsjett til (NOK)">
          <input
            className="field"
            id="job-budget-max"
            name="budgetMax"
            type="number"
            min={0}
            step="1"
            value={values.budgetMax}
            onChange={set("budgetMax")}
          />
        </Field>
      </div>
      {!jobId ? <JobImagePicker /> : null}
      <p className="text-sm text-ink-soft">
        Ikke skriv telefon, e-post eller lenker her. Filteret stopper det med en forklaring, og du kan rette teksten.
      </p>
      <button className="btn btn-copper" disabled={pending} type="submit">
        {pending ? "Lagrer…" : jobId ? "Lagre endringer" : "Publiser oppdrag"}
      </button>
    </form>
  );
}

export function OfferForm({
  jobId,
  feeBps,
  defaultAmountOre,
}: {
  jobId: string;
  feeBps: number;
  defaultAmountOre: number;
}) {
  const [state, action, pending] = useActionState(createOfferAction, {});
  const [amount, setAmount] = useState(String(Math.round(defaultAmountOre / 100)));
  const [message, setMessage] = useState("");
  const amountOre = Number(amount) > 0 ? nokToOre(Number(amount)) : 0;
  const preview = amountOre > 0 ? calcCommission(amountOre, feeBps) : null;

  return (
    <form action={action} className="grid gap-3">
      <input type="hidden" name="jobId" value={jobId} />
      <ErrorBox state={state} />
      <Field id="offer-amount" label="Fastpris (NOK)">
        <input
          className="field"
          id="offer-amount"
          name="amount"
          type="number"
          min={100}
          required
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
        />
      </Field>
      <Field id="offer-message" label="Melding til kunden">
        <textarea
          className="field min-h-28"
          id="offer-message"
          name="message"
          required
          placeholder="Hva inngår, når kan dere starte?"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
        />
      </Field>
      {preview ? (
        <FeeBox
          amountOre={amountOre}
          feeOre={preview.platformFeeOre}
          payoutOre={preview.providerPayoutOre}
          audience="provider"
        />
      ) : (
        <p className="text-xs text-ink-soft">Skriv inn pris for å se gebyr og forventet oppgjør.</p>
      )}
      <button className="btn btn-copper" disabled={pending} type="submit">
        {pending ? "Sender…" : "Gi tilbud"}
      </button>
    </form>
  );
}

export function ChatForm({ conversationId }: { conversationId: string }) {
  const [body, setBody] = useState("");
  const [state, action, pending] = useActionState(async (prev: ActionState, formData: FormData) => {
    const result = await sendMessageAction(prev, formData);
    if (result.ok) setBody("");
    return result;
  }, {});
  return (
    <form action={action} className="grid gap-2">
      <input type="hidden" name="conversationId" value={conversationId} />
      <ErrorBox state={state} />
      {state?.ok ? <Alert tone="ok">Meldingen er sendt.</Alert> : null}
      <Field id="chat-body" label="Melding">
        <textarea
          className="field min-h-24"
          id="chat-body"
          name="body"
          required
          placeholder="Skriv en melding uten telefon, e-post eller lenker"
          value={body}
          onChange={(event) => setBody(event.target.value)}
        />
      </Field>
      <p className="text-xs text-ink-soft">
        Vedlegg er slått av i v1. Filteret kan treffe feil — juster teksten og send på nytt.
      </p>
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
      <Field id="report-reason" label="Hvorfor vil du melde fra?">
        <input className="field" id="report-reason" name="reason" required />
      </Field>
      <Field id="report-details" label="Utdyping (valgfritt)">
        <textarea className="field min-h-20" id="report-details" name="details" placeholder="Valgfri utdyping" />
      </Field>
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
      <Field id="review-rating" label="Terning (1–5)">
        <select className="field" id="review-rating" name="rating" defaultValue="5">
          <option value="5">5 — svært fornøyd</option>
          <option value="4">4</option>
          <option value="3">3</option>
          <option value="2">2</option>
          <option value="1">1</option>
        </select>
      </Field>
      <Field id="review-comment" label="Kommentar">
        <textarea className="field min-h-24" id="review-comment" name="comment" required />
      </Field>
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
      <Field id="extra-title" label="Beskrivelse av tillegg">
        <input className="field" id="extra-title" name="title" required placeholder="F.eks. Ekstra stikkontakt" />
      </Field>
      <Field id="extra-amount" label="Pris (NOK)">
        <input className="field" id="extra-amount" name="amount" type="number" min={100} required placeholder="Beløp NOK" />
      </Field>
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
      <Field id="cancel-reason" label="Grunn til avbestilling">
        <textarea className="field min-h-20" id="cancel-reason" name="reason" required placeholder="Grunn" />
      </Field>
      <button className="btn btn-secondary" disabled={pending} type="submit">
        Avbestill
      </button>
    </form>
  );
}

export function ProfileForm({
  user,
}: {
  user: {
    name: string;
    phone: string | null;
    role: string;
    customerProfile: { area: string | null; addressLine: string | null; postalCode: string | null; city: string | null } | null;
    providerProfile: { about: string | null; serviceAreas: string | null } | null;
  };
}) {
  const [state, action, pending] = useActionState(updateProfileAction, {});
  return (
    <form action={action} className="grid gap-3">
      <ErrorBox state={state} />
      {state?.ok ? <Alert tone="ok">Profilen er oppdatert.</Alert> : null}
      <Field id="profile-name" label="Navn">
        <input className="field" id="profile-name" name="name" required defaultValue={user.name} />
      </Field>
      <Field id="profile-phone" label="Telefon">
        <input className="field" id="profile-phone" name="phone" defaultValue={user.phone ?? ""} />
      </Field>
      {user.customerProfile ? (
        <>
          <Field id="profile-area" label="Område">
            <select className="field" id="profile-area" name="area" defaultValue={user.customerProfile.area ?? "Grünerløkka"}>
              {OSLO_AREAS.map((area) => (
                <option key={area}>{area}</option>
              ))}
            </select>
          </Field>
          <Field id="profile-address" label="Gateadresse">
            <input className="field" id="profile-address" name="addressLine" defaultValue={user.customerProfile.addressLine ?? ""} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field id="profile-postal" label="Postnr">
              <input className="field" id="profile-postal" name="postalCode" defaultValue={user.customerProfile.postalCode ?? ""} />
            </Field>
            <Field id="profile-city" label="Sted">
              <input className="field" id="profile-city" name="city" defaultValue={user.customerProfile.city ?? "Oslo"} />
            </Field>
          </div>
        </>
      ) : null}
      {user.providerProfile ? (
        <>
          <Field id="profile-about" label="Om firmaet">
            <textarea className="field min-h-24" id="profile-about" name="about" defaultValue={user.providerProfile.about ?? ""} />
          </Field>
          <Field id="profile-areas" label="Områder dere dekker">
            <input className="field" id="profile-areas" name="serviceAreas" defaultValue={user.providerProfile.serviceAreas ?? ""} />
          </Field>
        </>
      ) : null}
      <button className="btn btn-primary" disabled={pending} type="submit">
        {pending ? "Lagrer…" : "Lagre profil"}
      </button>
    </form>
  );
}

export function DataRequestForm() {
  const [state, action, pending] = useActionState(requestDataAction, {});
  return (
    <form action={action} className="grid gap-3">
      <ErrorBox state={state} />
      {state?.ok ? <Alert tone="ok">Forespørselen er registrert. Admin behandler køen.</Alert> : null}
      <Field id="data-request-type" label="Type">
        <select className="field" id="data-request-type" name="type" required>
          <option value="ACCESS">Innsyn</option>
          <option value="EXPORT">Eksport</option>
          <option value="DELETION">Sletting / anonymisering</option>
        </select>
      </Field>
      <Field id="data-request-message" label="Begrunnelse (valgfritt)">
        <textarea className="field min-h-20" id="data-request-message" name="message" />
      </Field>
      <p className="text-xs text-ink-soft">
        Sletting anonymiserer profil og chat. Beløp, provisjon og tviststatus beholdes for regnskap.
      </p>
      <button className="btn btn-primary" disabled={pending} type="submit">
        {pending ? "Sender…" : "Send forespørsel"}
      </button>
    </form>
  );
}

export function ContactForm() {
  const [state, action, pending] = useActionState(contactAction, {});
  return (
    <form action={action} className="grid gap-3">
      <ErrorBox state={state} />
      {state?.ok ? <Alert tone="ok">Meldingen er sendt til eier. Dette er ikke et ticketsystem.</Alert> : null}
      <Field id="contact-name" label="Navn">
        <input className="field" id="contact-name" name="name" required />
      </Field>
      <Field id="contact-email" label="E-post">
        <input className="field" id="contact-email" name="email" type="email" required />
      </Field>
      <Field id="contact-message" label="Melding">
        <textarea className="field min-h-32" id="contact-message" name="message" required />
      </Field>
      <button className="btn btn-primary" disabled={pending || state?.ok} type="submit">
        {pending ? "Sender…" : "Send melding"}
      </button>
    </form>
  );
}

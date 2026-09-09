import { StatusBadge } from "@/components/ui";
import { formatNok } from "@/lib/money";

export function ProviderSentOffer({
  amountOre,
  message,
  sentAtLabel,
  status,
}: {
  amountOre: number;
  message: string;
  sentAtLabel: string;
  status: string;
}) {
  return (
    <div id="mitt-tilbud" className="card scroll-mt-24 p-5">
      <p className="kicker">Tilbud</p>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-serif text-xl tracking-tight">✓ Tilbud sendt</h2>
        <StatusBadge status={status} kind="offer" />
      </div>
      <p className="mt-1 text-sm text-ink-soft">
        Kunden har mottatt tilbudet. Du kan ikke sende et nytt så lenge dette er aktivt.
      </p>
      <dl className="mt-4 space-y-3 text-sm">
        <div>
          <dt className="text-ink-soft">Ditt tilbud</dt>
          <dd className="font-serif text-2xl">{formatNok(amountOre)}</dd>
        </div>
        <div>
          <dt className="text-ink-soft">Melding til kunden</dt>
          <dd className="mt-1 whitespace-pre-wrap">{message}</dd>
        </div>
        <div>
          <dt className="text-ink-soft">Sendt</dt>
          <dd className="font-semibold">{sentAtLabel}</dd>
        </div>
        <div>
          <dt className="text-ink-soft">Status</dt>
          <dd className="mt-1">
            <StatusBadge status={status} kind="offer" />
          </dd>
        </div>
      </dl>
    </div>
  );
}

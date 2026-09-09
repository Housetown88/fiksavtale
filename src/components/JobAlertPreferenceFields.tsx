"use client";

import { JOB_ALERT_RADIUS_KM, JOB_CATEGORY_TREE, OSLO_AREAS } from "@/lib/categories";

export type JobAlertFieldValues = {
  categories: string[];
  areas: string[];
  radiusKm: number | null;
  emailEnabled: boolean;
  paused: boolean;
};

function toggle(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

function CheckRow({
  name,
  value,
  checked,
  label,
  onChange,
  indent = false,
}: {
  name: string;
  value: string;
  checked: boolean;
  label: string;
  onChange: () => void;
  indent?: boolean;
}) {
  return (
    <label
      className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-[var(--radius)] px-2 py-2 hover:bg-sand/60 ${indent ? "ml-3" : ""}`}
    >
      <input
        className="h-5 w-5 shrink-0 accent-[var(--pine)]"
        type="checkbox"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
      />
      <span className="text-sm font-medium leading-snug">{label}</span>
    </label>
  );
}

export function JobAlertPreferenceFields({
  values,
  onChange,
  showPause = false,
  idPrefix = "alert",
  sectionHidden,
}: {
  values: JobAlertFieldValues;
  onChange: (next: JobAlertFieldValues) => void;
  showPause?: boolean;
  idPrefix?: string;
  sectionHidden?: { services?: boolean; geo?: boolean; email?: boolean };
}) {
  const setCategories = (categories: string[]) => onChange({ ...values, categories });
  const setAreas = (areas: string[]) => onChange({ ...values, areas });

  return (
    <div className="grid gap-6">
      <section className={sectionHidden?.services ? "hidden" : undefined}>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-serif text-xl">Hvilke typer oppdrag ønsker bedriften din?</h3>
          <div className="flex gap-2">
            <button
              className="btn btn-secondary btn-sm"
              type="button"
              onClick={() =>
                setCategories(
                  JOB_CATEGORY_TREE.flatMap((parent) => [parent.slug, ...parent.children.map((child) => child.slug)]),
                )
              }
            >
              Velg alle
            </button>
            <button className="btn btn-secondary btn-sm" type="button" onClick={() => setCategories([])}>
              Fjern alle
            </button>
          </div>
        </div>
        <p className="mb-3 text-sm text-ink-soft">
          Kryss av fag og underkategorier. Velger du hele faget, får du varsel for alle oppdrag i den kategorien.
        </p>
        <div className="grid gap-3">
          {JOB_CATEGORY_TREE.map((parent) => {
            const childSlugs = parent.children.map((child) => child.slug);
            const allChildren = childSlugs.every((slug) => values.categories.includes(slug));
            const parentOn = values.categories.includes(parent.slug);
            return (
              <fieldset key={parent.slug} className="card p-3">
                <legend className="sr-only">{parent.label}</legend>
                <CheckRow
                  name="alertCategories"
                  value={parent.slug}
                  checked={parentOn}
                  label={parent.label}
                  onChange={() => {
                    if (parentOn && allChildren) {
                      setCategories(
                        values.categories.filter((slug) => slug !== parent.slug && !childSlugs.includes(slug)),
                      );
                    } else {
                      setCategories([...new Set([...values.categories, parent.slug, ...childSlugs])]);
                    }
                  }}
                />
                <div className="mt-1 grid sm:grid-cols-2">
                  {parent.children.map((child) => (
                    <CheckRow
                      key={child.slug}
                      name="alertCategories"
                      value={child.slug}
                      checked={values.categories.includes(child.slug)}
                      label={child.label}
                      indent
                      onChange={() => {
                        let next = toggle(values.categories, child.slug);
                        const allKids = childSlugs.every((slug) => next.includes(slug));
                        if (allKids) next = [...new Set([...next, parent.slug])];
                        else next = next.filter((slug) => slug !== parent.slug);
                        setCategories(next);
                      }}
                    />
                  ))}
                </div>
              </fieldset>
            );
          })}
        </div>
      </section>

      <section className={sectionHidden?.geo ? "hidden" : undefined}>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-serif text-xl">Hvor ønsker dere å motta oppdrag?</h3>
          <div className="flex gap-2">
            <button className="btn btn-secondary btn-sm" type="button" onClick={() => setAreas([...OSLO_AREAS])}>
              Velg alle
            </button>
            <button className="btn btn-secondary btn-sm" type="button" onClick={() => setAreas([])}>
              Fjern alle
            </button>
          </div>
        </div>
        <p className="mb-3 text-sm text-ink-soft">
          Velg områder på Jobbenmin. Radius lagres for senere avstandssøk; matching i dag er områdene du krysser av.
        </p>
        <div className="card grid gap-1 p-3 sm:grid-cols-2">
          {OSLO_AREAS.map((area) => (
            <CheckRow
              key={area}
              name="alertAreas"
              value={area}
              checked={values.areas.includes(area)}
              label={area}
              onChange={() => setAreas(toggle(values.areas, area))}
            />
          ))}
        </div>
        <div className="mt-3">
          <label className="label" htmlFor={`${idPrefix}-radius`}>
            Ønsket radius fra firmaadresse (lagres, brukes når geokoding kommer)
          </label>
          <select
            className="field"
            id={`${idPrefix}-radius`}
            name="alertRadiusKm"
            value={values.radiusKm ?? ""}
            onChange={(event) =>
              onChange({
                ...values,
                radiusKm: event.target.value ? Number(event.target.value) : null,
              })
            }
          >
            <option value="">Ikke valgt</option>
            {JOB_ALERT_RADIUS_KM.map((km) => (
              <option key={km} value={km}>
                {km} km
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className={`card space-y-3 p-4 ${sectionHidden?.email ? "hidden" : ""}`}>
        <h3 className="font-serif text-xl">Vil du få beskjed på e-post når en passende jobb publiseres?</h3>
        <label className="flex min-h-12 cursor-pointer items-start gap-3">
          <input
            className="mt-1 h-5 w-5 shrink-0 accent-[var(--pine)]"
            type="checkbox"
            name="alertEmailEnabled"
            value="1"
            checked={values.emailEnabled}
            onChange={(event) => onChange({ ...values, emailEnabled: event.target.checked })}
          />
          <span>
            <span className="font-semibold">Send meg e-post når et relevant oppdrag publiseres</span>
            <span className="mt-1 block text-sm text-ink-soft">
              Bare jobber som matcher både fag og område. Eldre oppdrag sendes ikke på nytt.
            </span>
          </span>
        </label>
        {showPause ? (
          <label className="flex min-h-12 cursor-pointer items-start gap-3">
            <input
              className="mt-1 h-5 w-5 shrink-0 accent-[var(--pine)]"
              type="checkbox"
              name="alertPaused"
              value="1"
              checked={values.paused}
              onChange={(event) => onChange({ ...values, paused: event.target.checked })}
            />
            <span>
              <span className="font-semibold">Sett alle varsler på pause</span>
              <span className="mt-1 block text-sm text-ink-soft">
                Preferansene beholdes, men ingen e-post sendes før du slår pause av.
              </span>
            </span>
          </label>
        ) : null}
      </section>
    </div>
  );
}

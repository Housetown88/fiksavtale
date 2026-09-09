import { describe, expect, it } from "vitest";
import { LeakFilterError } from "../leak-filter";
import {
  applyJobCategoryChange,
  jobFormFailureState,
  jobFormFieldsFromFormData,
  mergeJobFormFields,
} from "../job-form-state";

function belysningFields() {
  return {
    title: "Nye spotter i stua",
    description: "Ring meg på 40012345 når du kan komme.",
    category: "elektriker",
    subcategory: "elektriker.belysning",
    area: "Grünerløkka",
    addressLine: "Markveien 12",
    postalCode: "0550",
    budgetMin: "2000",
    budgetMax: "4000",
  };
}

describe("jobbskjema ved valideringsfeil", () => {
  it("beholder Belysning etter avvist kontaktfilter", () => {
    const formData = new FormData();
    const submitted = belysningFields();
    for (const [key, value] of Object.entries(submitted)) {
      formData.set(key, value);
    }

    const fields = jobFormFieldsFromFormData(formData);
    expect(fields.subcategory).toBe("elektriker.belysning");
    expect(fields.category).toBe("elektriker");

    const state = jobFormFailureState(
      new LeakFilterError("Teksten ser ut til å inneholde telefonnummer. Fjern det og juster teksten.", [
        { type: "phone", excerpt: "40012345" },
      ]),
      fields,
    );

    expect(state.fields.subcategory).toBe("elektriker.belysning");
    expect(state.fields.category).toBe("elektriker");
    expect(state.fields.description).toContain("40012345");
    expect(state.fields.budgetMin).toBe("2000");
    expect(state.fields.budgetMax).toBe("4000");
    expect(state).not.toHaveProperty("ok");

    const afterNativeReset = { ...submitted, subcategory: "", category: "rorlegger" };
    const restored = mergeJobFormFields(afterNativeReset, state.fields);
    expect(restored.subcategory).toBe("elektriker.belysning");
    expect(restored.category).toBe("elektriker");
  });

  it("nullstiller ikke gyldig underkategori når kategorien er uendret", () => {
    const current = belysningFields();
    const same = applyJobCategoryChange(current, "elektriker");
    expect(same.subcategory).toBe("elektriker.belysning");
    const other = applyJobCategoryChange(current, "rorlegger");
    expect(other.subcategory).toBe("");
    expect(other.category).toBe("rorlegger");
  });
});

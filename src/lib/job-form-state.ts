import { AuthzError } from "./authz";
import { childrenOf } from "./categories";
import { errorMessage } from "./errors";
import { LeakFilterError } from "./leak-filter";

export type JobFormFields = {
  title: string;
  description: string;
  category: string;
  subcategory: string;
  area: string;
  addressLine: string;
  postalCode: string;
  budgetMin: string;
  budgetMax: string;
};

export function emptyJobFormFields(): JobFormFields {
  return {
    title: "",
    description: "",
    category: "elektriker",
    subcategory: "",
    area: "Grünerløkka",
    addressLine: "",
    postalCode: "",
    budgetMin: "",
    budgetMax: "",
  };
}

export function jobFormFieldsFromFormData(formData: FormData): JobFormFields {
  return {
    title: String(formData.get("title") ?? ""),
    description: String(formData.get("description") ?? ""),
    category: String(formData.get("category") ?? ""),
    subcategory: String(formData.get("subcategory") ?? ""),
    area: String(formData.get("area") ?? ""),
    addressLine: String(formData.get("addressLine") ?? ""),
    postalCode: String(formData.get("postalCode") ?? ""),
    budgetMin: String(formData.get("budgetMin") ?? ""),
    budgetMax: String(formData.get("budgetMax") ?? ""),
  };
}

/** Bytt kategori uten å nullstille gyldig underkategori. */
export function applyJobCategoryChange(current: JobFormFields, nextCategory: string): JobFormFields {
  const stillValid = childrenOf(nextCategory).some((child) => child.slug === current.subcategory);
  return {
    ...current,
    category: nextCategory,
    subcategory: stillValid ? current.subcategory : "",
  };
}

export function mergeJobFormFields(
  current: JobFormFields,
  returned?: Partial<JobFormFields> | null,
): JobFormFields {
  if (!returned) return current;
  return {
    ...current,
    ...Object.fromEntries(Object.entries(returned).filter(([, value]) => value !== undefined)),
  };
}

export function jobFormFailureState(
  error: unknown,
  fields: JobFormFields,
): {
  error: string;
  highlights?: string[];
  fields: JobFormFields;
} {
  const highlights = error instanceof LeakFilterError ? error.leaks.map((leak) => leak.excerpt) : undefined;
  const message =
    error instanceof LeakFilterError || error instanceof AuthzError ? error.message : errorMessage(error);
  return { error: message, highlights, fields };
}

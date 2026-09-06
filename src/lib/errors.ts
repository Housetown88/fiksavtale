import { AuthzError } from "./authz";
import { LeakFilterError } from "./leak-filter";

export function errorMessage(error: unknown): string {
  if (error instanceof LeakFilterError || error instanceof AuthzError) {
    return error.message;
  }
  if (error instanceof Error) {
    if (error.message === "UNAUTHENTICATED") {
      return "Du må logge inn for å fortsette.";
    }
    return error.message;
  }
  return "Noe gikk galt. Prøv igjen.";
}

export function errorStatus(error: unknown): number {
  if (error instanceof AuthzError) return error.status;
  if (error instanceof LeakFilterError) return 400;
  if (error instanceof Error && error.message === "UNAUTHENTICATED") return 401;
  return 400;
}

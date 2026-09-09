import { AuthzError } from "./authz";
import { LeakFilterError } from "./leak-filter";
import { DatabaseUnavailableError } from "./database-url";

const INFRA_ERROR = /DATABASE_URL|SQLite-fil|sqlite/i;

export function errorMessage(error: unknown): string {
  if (error instanceof LeakFilterError || error instanceof AuthzError) {
    return error.message;
  }
  if (error instanceof DatabaseUnavailableError) {
    return "Noe gikk galt. Prøv igjen.";
  }
  if (error instanceof Error) {
    if (error.message === "UNAUTHENTICATED") {
      return "Du må logge inn for å fortsette.";
    }
    if (INFRA_ERROR.test(error.message)) {
      return "Noe gikk galt. Prøv igjen.";
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

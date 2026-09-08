import { orgRegisterLabel } from "./brreg";

export type OrgBadge = {
  key: string;
  label: string;
  tone: "ok" | "warn" | "info";
  checked: boolean;
};

export function orgBadges(profile: {
  orgVerified: boolean;
  orgRegisterStatus?: string | null;
  orgRegisterName?: string | null;
  orgRepConfirmed?: boolean | null;
  tradeAuthChecked?: boolean | null;
}): OrgBadge[] {
  const register = profile.orgRegisterStatus ?? "NOT_CHECKED";
  return [
    {
      key: "format",
      label: profile.orgVerified ? "Org.nr format OK" : "Org.nr format ikke OK",
      tone: profile.orgVerified ? "ok" : "warn",
      checked: profile.orgVerified,
    },
    {
      key: "register",
      label: orgRegisterLabel(register),
      tone: register === "NAME_MATCH" || register === "FOUND" ? "ok" : register === "NOT_CHECKED" ? "info" : "warn",
      checked: register === "NAME_MATCH" || register === "FOUND",
    },
    {
      key: "representative",
      label: profile.orgRepConfirmed
        ? "Signaturrett bekreftet av eier"
        : "Signaturrett: ikke bekreftet",
      tone: profile.orgRepConfirmed ? "ok" : "info",
      checked: Boolean(profile.orgRepConfirmed),
    },
    {
      key: "trade",
      label: profile.tradeAuthChecked
        ? "Faglig godkjenning sjekket"
        : "Faglig godkjenning: ikke sjekket",
      tone: "info",
      checked: Boolean(profile.tradeAuthChecked),
    },
  ];
}

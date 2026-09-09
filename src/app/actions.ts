"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser, createSession, destroySession } from "@/lib/session";
import {
  acceptOffer,
  cancelBooking,
  completeBooking,
  createJob,
  createOfferResult,
  createReport,
  createReview,
  decideExtra,
  markWorkStarted,
  parseJobBudget,
  proposeExtra,
  registerUser,
  requestPasswordReset,
  resetPasswordWithToken,
  sendMessage,
  updateJob,
  updateProfile,
  verifyPassword,
} from "@/lib/domain";
import { errorMessage } from "@/lib/errors";
import { writeAuditLog } from "@/lib/audit";
import { createPaymentIntent, confirmDemoPayment, demoPaymentEventId } from "@/lib/payments";
import { jobFormFailureState, jobFormFieldsFromFormData } from "@/lib/job-form-state";
import type { JobFormFields } from "@/lib/job-form-state";
import { nokToOre } from "@/lib/money";
import { AuthzError } from "@/lib/authz";
import { collectJobImageFiles, saveJobImages } from "@/lib/job-images";
import { LeakFilterError } from "@/lib/leak-filter";
import { offerSendFailureState } from "@/lib/offer-submit";
import { adminDemoAllowed, isDemoAdminEmail } from "@/lib/demo-mode";
import { headers } from "next/headers";
import { createDataRequest, exportUserData, resolveDataRequest, type DataRequestType } from "@/lib/privacy";
import { lookupOrgInBrreg } from "@/lib/brreg";
import { dispatchJobAlerts, saveJobAlertPreference } from "@/lib/job-alerts";
import { parseRadiusKm } from "@/lib/categories";

export type ActionState = {
  error?: string;
  ok?: boolean;
  highlights?: string[];
  fields?: Partial<JobFormFields> & {
    amount?: string;
    message?: string;
  };
};

export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = String(formData.get("email") ?? "").toLowerCase().trim();
  const password = String(formData.get("password") ?? "");
  if (isDemoAdminEmail(email) && !adminDemoAllowed()) {
    return { error: "Demokontoen for admin er slått av i dette miljøet." };
  }
  const user = await db.user.findUnique({ where: { email } });
  if (!user || user.deletedAt || !(await verifyPassword(password, user.passwordHash))) {
    return { error: "Feil e-post eller passord." };
  }
  await createSession(user.id);
  redirect("/oversikt");
}

export async function logoutAction() {
  await destroySession();
  redirect("/");
}

export async function registerAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const role = String(formData.get("role") ?? "CUSTOMER") === "PROVIDER" ? "PROVIDER" : "CUSTOMER";
    const user = await registerUser(db, {
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      name: String(formData.get("name") ?? ""),
      phone: String(formData.get("phone") ?? "") || undefined,
      role,
      area: String(formData.get("area") ?? "") || undefined,
      addressLine: String(formData.get("addressLine") ?? "") || undefined,
      postalCode: String(formData.get("postalCode") ?? "") || undefined,
      city: String(formData.get("city") ?? "") || undefined,
      companyName: String(formData.get("companyName") ?? "") || undefined,
      orgNumber: String(formData.get("orgNumber") ?? "") || undefined,
      about: String(formData.get("about") ?? "") || undefined,
      serviceAreas: String(formData.get("serviceAreas") ?? "") || undefined,
      alertCategories: formData.getAll("alertCategories").map(String),
      alertAreas: formData.getAll("alertAreas").map(String),
      alertRadiusKm: parseRadiusKm(formData.get("alertRadiusKm")),
      alertEmailEnabled: String(formData.get("alertEmailEnabled") ?? "") === "1",
    });
    await createSession(user.id);
  } catch (error) {
    return { error: errorMessage(error) };
  }
  redirect("/oversikt");
}

function bookingNoticePath(
  bookingId: string,
  message: string,
  options?: { intent?: string; extraChargeId?: string; confirm?: boolean },
) {
  const params = new URLSearchParams({ varsel: message });
  if (options?.intent) params.set("intent", options.intent);
  if (options?.extraChargeId) params.set("extra", options.extraChargeId);
  const path = options?.confirm ? `/booking/${bookingId}/bekreftelse` : `/booking/${bookingId}`;
  return `${path}?${params.toString()}`;
}

async function viewer() {
  const user = await getCurrentUser();
  if (!user) throw new AuthzError("Du må være innlogget", 401);
  return user;
}

function actionError(error: unknown): ActionState {
  const highlights = error instanceof LeakFilterError ? error.leaks.map((leak) => leak.excerpt) : undefined;
  return { error: errorMessage(error), highlights };
}

export async function createJobAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const user = await viewer();
    const budget = parseJobBudget({
      budgetMin: formData.get("budgetMin"),
      budgetMax: formData.get("budgetMax"),
    });
    const job = await createJob(db, user, {
      title: String(formData.get("title") ?? ""),
      description: String(formData.get("description") ?? ""),
      category: String(formData.get("category") ?? ""),
      subcategory: String(formData.get("subcategory") ?? "") || null,
      area: String(formData.get("area") ?? ""),
      postalCode: String(formData.get("postalCode") ?? "") || undefined,
      addressLine: String(formData.get("addressLine") ?? "") || undefined,
      budgetMinOre: budget.budgetMinOre,
      budgetMaxOre: budget.budgetMaxOre,
    });
    try {
      await saveJobImages(db, job.id, collectJobImageFiles(formData));
    } catch (error) {
      await db.job.delete({ where: { id: job.id } });
      throw error;
    }
    try {
      await dispatchJobAlerts(db, job);
    } catch (error) {
      console.error("job-alerts-dispatch-failed", job.id, error);
    }
    redirect(`/oppdrag/${job.id}`);
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    return jobFormFailureState(error, jobFormFieldsFromFormData(formData));
  }
}

export async function updateJobAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const user = await viewer();
    const budget = parseJobBudget({
      budgetMin: formData.get("budgetMin"),
      budgetMax: formData.get("budgetMax"),
    });
    const jobId = String(formData.get("jobId") ?? "");
    await updateJob(db, user, jobId, {
      title: String(formData.get("title") ?? ""),
      description: String(formData.get("description") ?? ""),
      category: String(formData.get("category") ?? ""),
      subcategory: String(formData.get("subcategory") ?? "") || null,
      area: String(formData.get("area") ?? ""),
      postalCode: String(formData.get("postalCode") ?? "") || undefined,
      addressLine: String(formData.get("addressLine") ?? "") || undefined,
      budgetMinOre: budget.budgetMinOre,
      budgetMaxOre: budget.budgetMaxOre,
    });
    redirect(`/oppdrag/${jobId}`);
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    return jobFormFailureState(error, jobFormFieldsFromFormData(formData));
  }
}

export async function updateJobAlertPreferenceAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const user = await viewer();
    await saveJobAlertPreference(db, user, {
      categories: formData.getAll("alertCategories").map(String),
      areas: formData.getAll("alertAreas").map(String),
      radiusKm: parseRadiusKm(formData.get("alertRadiusKm")),
      emailEnabled: String(formData.get("alertEmailEnabled") ?? "") === "1",
      paused: String(formData.get("alertPaused") ?? "") === "1",
    });
    revalidatePath("/konto/jobbvarsler");
    revalidatePath("/oversikt");
    revalidatePath("/konto");
    return { ok: true };
  } catch (error) {
    return actionError(error);
  }
}

export async function updateProfileAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const user = await viewer();
    await updateProfile(db, user, {
      name: String(formData.get("name") ?? ""),
      phone: String(formData.get("phone") ?? "") || undefined,
      area: String(formData.get("area") ?? "") || undefined,
      addressLine: String(formData.get("addressLine") ?? "") || undefined,
      postalCode: String(formData.get("postalCode") ?? "") || undefined,
      city: String(formData.get("city") ?? "") || undefined,
      about: String(formData.get("about") ?? "") || undefined,
      serviceAreas: String(formData.get("serviceAreas") ?? "") || undefined,
    });
    revalidatePath("/konto");
    return { ok: true };
  } catch (error) {
    return actionError(error);
  }
}

export async function createOfferAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const fields = {
    amount: String(formData.get("amount") ?? ""),
    message: String(formData.get("message") ?? ""),
  };
  const jobId = String(formData.get("jobId") ?? "");
  try {
    const user = await viewer();
    const result = await createOfferResult(db, user, {
      jobId,
      amountOre: nokToOre(Number(formData.get("amount") || 0)),
      message: fields.message,
    });
    revalidatePath(`/oppdrag/${jobId}`);
    revalidatePath("/oversikt");
    if (result.created) {
      redirect(`/oppdrag/${jobId}?sendt=${result.offer.id}`);
    }
    redirect(`/oppdrag/${jobId}?finnes=${result.offer.id}`);
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    return offerSendFailureState(error, fields);
  }
}

export async function sendMessageAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const user = await viewer();
    const conversationId = String(formData.get("conversationId") ?? "");
    await sendMessage(db, user, {
      conversationId,
      body: String(formData.get("body") ?? ""),
    });
    revalidatePath(`/samtaler/${conversationId}`);
    return { ok: true };
  } catch (error) {
    return actionError(error);
  }
}

export async function acceptOfferAction(formData: FormData) {
  const user = await viewer();
  const booking = await acceptOffer(db, user, String(formData.get("offerId") ?? ""));
  redirect(`/booking/${booking.id}`);
}

export async function startWorkAction(formData: FormData) {
  const bookingId = String(formData.get("bookingId") ?? "");
  try {
    const user = await viewer();
    const booking = await markWorkStarted(db, user, bookingId);
    redirect(`/booking/${booking.id}`);
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    redirect(bookingNoticePath(bookingId, errorMessage(error)));
  }
}

export async function completeBookingAction(formData: FormData) {
  const bookingId = String(formData.get("bookingId") ?? "");
  try {
    const user = await viewer();
    const booking = await completeBooking(db, user, bookingId);
    redirect(`/booking/${booking.id}`);
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    redirect(bookingNoticePath(bookingId, errorMessage(error)));
  }
}

export async function cancelBookingAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const user = await viewer();
    const booking = await cancelBooking(
      db,
      user,
      String(formData.get("bookingId") ?? ""),
      String(formData.get("reason") ?? "Avbestilt"),
    );
    redirect(`/booking/${booking.id}`);
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    return actionError(error);
  }
}

export async function reviewAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const user = await viewer();
    const bookingId = String(formData.get("bookingId") ?? "");
    await createReview(db, user, {
      bookingId,
      rating: Number(formData.get("rating") ?? 0),
      comment: String(formData.get("comment") ?? ""),
    });
    revalidatePath(`/booking/${bookingId}`);
    return { ok: true };
  } catch (error) {
    return actionError(error);
  }
}

export async function reportAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const user = await viewer();
    await createReport(db, user, {
      reason: String(formData.get("reason") ?? ""),
      details: String(formData.get("details") ?? ""),
      targetUserId: String(formData.get("targetUserId") ?? "") || undefined,
      targetJobId: String(formData.get("targetJobId") ?? "") || undefined,
    });
    revalidatePath("/admin/rapporter");
    return { ok: true };
  } catch (error) {
    return actionError(error);
  }
}

export async function extraAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const user = await viewer();
    const bookingId = String(formData.get("bookingId") ?? "");
    await proposeExtra(db, user, {
      bookingId,
      title: String(formData.get("title") ?? ""),
      amountOre: nokToOre(Number(formData.get("amount") ?? 0)),
    });
    revalidatePath(`/booking/${bookingId}`);
    return { ok: true };
  } catch (error) {
    return actionError(error);
  }
}

export async function decideExtraAction(formData: FormData) {
  const user = await viewer();
  const extra = await decideExtra(
    db,
    user,
    String(formData.get("extraId") ?? ""),
    String(formData.get("decision") ?? "") === "APPROVED" ? "APPROVED" : "REJECTED",
  );
  revalidatePath(`/booking/${extra.bookingId}`);
}

export async function startDemoPaymentAction(formData: FormData) {
  const bookingId = String(formData.get("bookingId") ?? "");
  const extraChargeId = String(formData.get("extraChargeId") ?? "") || undefined;
  try {
    const user = await viewer();
    const booking = await db.booking.findUnique({ where: { id: bookingId } });
    if (!booking || (booking.customerId !== user.id && user.role !== "ADMIN")) {
      throw new AuthzError("Bare kunden kan starte betaling", 403);
    }
    const intent = await createPaymentIntent(db, bookingId, extraChargeId ? { extraChargeId } : undefined);
    const extraQuery = extraChargeId ? `&extra=${extraChargeId}` : "";
    redirect(`/booking/${bookingId}/bekreftelse?intent=${intent.id}${extraQuery}`);
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    redirect(
      bookingNoticePath(bookingId, errorMessage(error), extraChargeId ? { extraChargeId } : undefined),
    );
  }
}

export async function simulateWebhookAction(formData: FormData) {
  const bookingId = String(formData.get("bookingId") ?? "");
  const intentId = String(formData.get("intentId") ?? "");
  const extraChargeId = String(formData.get("extraChargeId") ?? "") || undefined;
  try {
    const user = await viewer();
    const booking = await db.booking.findUnique({ where: { id: bookingId } });
    if (!booking || (booking.customerId !== user.id && user.role !== "ADMIN")) {
      throw new AuthzError("Ikke tillatt", 403);
    }
    const outcome = String(formData.get("outcome") ?? "succeeded");
    const type =
      outcome === "failed"
        ? "payment.failed"
        : outcome === "cancelled"
          ? "payment.cancelled"
          : "payment.succeeded";
    await confirmDemoPayment(db, {
      eventId: demoPaymentEventId(intentId, type),
      type,
      paymentIntentId: intentId,
      bookingId,
    });
    const extraQuery = extraChargeId ? `&extra=${extraChargeId}` : "";
    redirect(`/booking/${bookingId}/bekreftelse?intent=${intentId}${extraQuery}`);
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    redirect(
      bookingNoticePath(bookingId, errorMessage(error), {
        intent: intentId,
        extraChargeId,
        confirm: true,
      }),
    );
  }
}

export async function adminUpdateFeeAction(formData: FormData) {
  const user = await viewer();
  if (user.role !== "ADMIN") throw new AuthzError("Kun admin", 403);
  const platformFeeBps = Number(formData.get("platformFeeBps") ?? 1000);
  await db.platformSettings.update({
    where: { id: "default" },
    data: { platformFeeBps },
  });
  await writeAuditLog(db, {
    actorId: user.id,
    action: "UPDATE_FEE",
    targetType: "PlatformSettings",
    targetId: "default",
    details: `Ny sats: ${platformFeeBps} basispunkter (bps)`,
  });
  redirect("/admin/gebyr");
}

export async function adminToggleVerifyAction(formData: FormData) {
  const user = await viewer();
  if (user.role !== "ADMIN") throw new AuthzError("Kun admin", 403);
  const profileId = String(formData.get("profileId") ?? "");
  const orgVerified = String(formData.get("orgVerified") ?? "") === "true";
  const profile = await db.providerProfile.update({
    where: { id: profileId },
    data: { orgVerified },
  });
  await writeAuditLog(db, {
    actorId: user.id,
    action: "TOGGLE_ORG_VERIFIED",
    targetType: "ProviderProfile",
    targetId: profileId,
    details: `orgVerified=${orgVerified} org=${profile.orgNumber}`,
  });
  redirect("/admin/brukere");
}

export async function adminReviewReportAction(formData: FormData) {
  const user = await viewer();
  if (user.role !== "ADMIN") throw new AuthzError("Kun admin", 403);
  const reportId = String(formData.get("reportId") ?? "");
  const status = String(formData.get("status") ?? "REVIEWED") === "DISMISSED" ? "DISMISSED" : "REVIEWED";
  const treatmentNote = String(formData.get("treatmentNote") ?? "").trim() || null;
  await db.report.update({ where: { id: reportId }, data: { status, treatmentNote } });
  await writeAuditLog(db, {
    actorId: user.id,
    action: "REVIEW_REPORT",
    targetType: "Report",
    targetId: reportId,
    details: `${status}${treatmentNote ? ` — ${treatmentNote}` : ""}`,
  });
  redirect("/admin/rapporter");
}

export async function requestPasswordResetAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const email = String(formData.get("email") ?? "").toLowerCase().trim();
    if (!email) return { error: "Oppgi e-postadressen din." };
    const headerStore = await headers();
    const ip = headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() || headerStore.get("x-real-ip");
    await requestPasswordReset(db, email, { ip });
    return { ok: true };
  } catch (error) {
    return actionError(error);
  }
}

export async function resetPasswordAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await resetPasswordWithToken(
      db,
      String(formData.get("token") ?? ""),
      String(formData.get("password") ?? ""),
    );
    return { ok: true };
  } catch (error) {
    return actionError(error);
  }
}

export async function contactAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const name = String(formData.get("name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const message = String(formData.get("message") ?? "").trim();
    if (!name || !email || !message) {
      return { error: "Navn, e-post og melding må fylles ut." };
    }
    await db.contactMessage.create({ data: { name, email, message } });
    return { ok: true };
  } catch (error) {
    return actionError(error);
  }
}

export async function requestDataAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const user = await viewer();
    const type = String(formData.get("type") ?? "") as DataRequestType;
    await createDataRequest(db, user, {
      type,
      message: String(formData.get("message") ?? "") || undefined,
    });
    revalidatePath("/konto");
    return { ok: true };
  } catch (error) {
    return actionError(error);
  }
}

export async function exportMyDataAction(): Promise<ActionState> {
  try {
    const user = await viewer();
    await createDataRequest(db, user, { type: "EXPORT" });
    await exportUserData(db, user);
    revalidatePath("/konto");
    return { ok: true };
  } catch (error) {
    return actionError(error);
  }
}

export async function adminResolveDataRequestAction(formData: FormData) {
  const user = await viewer();
  if (user.role !== "ADMIN") throw new AuthzError("Kun admin", 403);
  const requestId = String(formData.get("requestId") ?? "");
  const status = String(formData.get("status") ?? "COMPLETED") === "REJECTED" ? "REJECTED" : "COMPLETED";
  await resolveDataRequest(db, user, requestId, {
    status,
    adminNote: String(formData.get("adminNote") ?? "") || undefined,
  });
  await writeAuditLog(db, {
    actorId: user.id,
    action: "RESOLVE_DATA_REQUEST",
    targetType: "DataRequest",
    targetId: requestId,
    details: status,
  });
  redirect("/admin/personvern");
}

export async function adminLookupOrgAction(formData: FormData) {
  const user = await viewer();
  if (user.role !== "ADMIN") throw new AuthzError("Kun admin", 403);
  const profileId = String(formData.get("profileId") ?? "");
  const profile = await db.providerProfile.findUnique({ where: { id: profileId } });
  if (!profile) throw new AuthzError("Profilen finnes ikke", 404);
  const lookup = await lookupOrgInBrreg(profile.orgNumber, profile.companyName);
  await db.providerProfile.update({
    where: { id: profileId },
    data: {
      orgRegisterStatus: lookup.status,
      orgRegisterName: lookup.registerName,
      orgLookupAt: new Date(),
    },
  });
  await writeAuditLog(db, {
    actorId: user.id,
    action: "BRREG_LOOKUP",
    targetType: "ProviderProfile",
    targetId: profileId,
    details: `${lookup.status} ${lookup.registerName ?? ""}`.trim(),
  });
  redirect("/admin/brukere");
}

export async function adminToggleRepConfirmedAction(formData: FormData) {
  const user = await viewer();
  if (user.role !== "ADMIN") throw new AuthzError("Kun admin", 403);
  const profileId = String(formData.get("profileId") ?? "");
  const confirmed = String(formData.get("orgRepConfirmed") ?? "") === "true";
  await db.providerProfile.update({
    where: { id: profileId },
    data: { orgRepConfirmed: confirmed },
  });
  await writeAuditLog(db, {
    actorId: user.id,
    action: "TOGGLE_ORG_REP",
    targetType: "ProviderProfile",
    targetId: profileId,
    details: `orgRepConfirmed=${confirmed}`,
  });
  redirect("/admin/brukere");
}

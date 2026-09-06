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
  createOffer,
  createReport,
  createReview,
  decideExtra,
  markWorkStarted,
  proposeExtra,
  registerUser,
  sendMessage,
  verifyPassword,
} from "@/lib/domain";
import { errorMessage } from "@/lib/errors";
import { writeAuditLog } from "@/lib/audit";
import { createPaymentIntent, handlePaymentWebhook } from "@/lib/payments";
import { nokToOre } from "@/lib/money";
import { AuthzError } from "@/lib/authz";
import { collectJobImageFiles, saveJobImages } from "@/lib/job-images";

export type ActionState = { error?: string; ok?: boolean };

export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = String(formData.get("email") ?? "").toLowerCase().trim();
  const password = String(formData.get("password") ?? "");
  const user = await db.user.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
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
    });
    await createSession(user.id);
  } catch (error) {
    return { error: errorMessage(error) };
  }
  redirect("/oversikt");
}

async function viewer() {
  const user = await getCurrentUser();
  if (!user) throw new AuthzError("Du må være innlogget", 401);
  return user;
}

export async function createJobAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const user = await viewer();
    const min = Number(formData.get("budgetMin") || 0);
    const max = Number(formData.get("budgetMax") || 0);
    const job = await createJob(db, user, {
      title: String(formData.get("title") ?? ""),
      description: String(formData.get("description") ?? ""),
      category: String(formData.get("category") ?? ""),
      area: String(formData.get("area") ?? ""),
      postalCode: String(formData.get("postalCode") ?? "") || undefined,
      addressLine: String(formData.get("addressLine") ?? "") || undefined,
      budgetMinOre: min ? nokToOre(min) : undefined,
      budgetMaxOre: max ? nokToOre(max) : undefined,
    });
    try {
      await saveJobImages(db, job.id, collectJobImageFiles(formData));
    } catch (error) {
      await db.job.delete({ where: { id: job.id } });
      throw error;
    }
    redirect(`/oppdrag/${job.id}`);
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    return { error: errorMessage(error) };
  }
}

export async function createOfferAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const user = await viewer();
    const amount = Number(formData.get("amount") || 0);
    const offer = await createOffer(db, user, {
      jobId: String(formData.get("jobId") ?? ""),
      amountOre: nokToOre(amount),
      message: String(formData.get("message") ?? ""),
    });
    const conversation = await db.conversation.findFirstOrThrow({ where: { offerId: offer.id } });
    redirect(`/samtaler/${conversation.id}`);
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    return { error: errorMessage(error) };
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
    return { error: errorMessage(error) };
  }
}

export async function acceptOfferAction(formData: FormData) {
  const user = await viewer();
  const booking = await acceptOffer(db, user, String(formData.get("offerId") ?? ""));
  redirect(`/booking/${booking.id}`);
}

export async function startWorkAction(formData: FormData) {
  const user = await viewer();
  const booking = await markWorkStarted(db, user, String(formData.get("bookingId") ?? ""));
  redirect(`/booking/${booking.id}`);
}

export async function completeBookingAction(formData: FormData) {
  const user = await viewer();
  const booking = await completeBooking(db, user, String(formData.get("bookingId") ?? ""));
  redirect(`/booking/${booking.id}`);
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
    return { error: errorMessage(error) };
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
    return { error: errorMessage(error) };
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
    return { error: errorMessage(error) };
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
    return { error: errorMessage(error) };
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
  const user = await viewer();
  const bookingId = String(formData.get("bookingId") ?? "");
  const booking = await db.booking.findUnique({ where: { id: bookingId } });
  if (!booking || (booking.customerId !== user.id && user.role !== "ADMIN")) {
    throw new AuthzError("Bare kunden kan starte betaling", 403);
  }
  const intent = await createPaymentIntent(db, bookingId);
  redirect(`/booking/${bookingId}/bekreftelse?intent=${intent.id}`);
}

export async function simulateWebhookAction(formData: FormData) {
  const user = await viewer();
  const bookingId = String(formData.get("bookingId") ?? "");
  const intentId = String(formData.get("intentId") ?? "");
  const outcome = String(formData.get("outcome") ?? "succeeded");
  const booking = await db.booking.findUnique({ where: { id: bookingId } });
  if (!booking || (booking.customerId !== user.id && user.role !== "ADMIN")) {
    throw new AuthzError("Ikke tillatt", 403);
  }
  const type =
    outcome === "failed"
      ? "payment.failed"
      : outcome === "cancelled"
        ? "payment.cancelled"
        : "payment.succeeded";
  await handlePaymentWebhook(db, {
    eventId: `demo_${intentId}_${type}_${Date.now()}`,
    type,
    paymentIntentId: intentId,
    bookingId,
  });
  redirect(`/booking/${bookingId}/bekreftelse?intent=${intentId}`);
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
    details: `Ny sats: ${platformFeeBps} bps`,
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
  await db.report.update({ where: { id: reportId }, data: { status } });
  await writeAuditLog(db, {
    actorId: user.id,
    action: "REVIEW_REPORT",
    targetType: "Report",
    targetId: reportId,
    details: status,
  });
  redirect("/admin/rapporter");
}

import { ApiError } from "../utils/ApiError.js";
import { REVIEW_STATES } from "../models/content.model.js";

/**
 * Pure moderation policy shared by languages and words.
 *
 * Keeping these rules here means the content service only coordinates
 * persistence, audit and history; it does not duplicate permission logic.
 */

export function requireActor(actor) {
  if (!actor) throw ApiError.unauthorized();
}

export function isAdmin(actor) {
  return actor?.role === "admin";
}

export function isModerator(actor) {
  return isAdmin(actor) || actor?.role === "reviewer";
}

export function assertCanEdit(existing, actor) {
  if (isAdmin(actor)) return;

  if (actor?.role === "reviewer") {
    if (existing.reviewStateCode === REVIEW_STATES.APPROVED) {
      throw ApiError.forbidden("Only an admin can change approved content.");
    }
    return;
  }

  if (existing.createdById !== actor?.id) {
    throw ApiError.forbidden(
      "Contributors can only edit entries they created. Ask a reviewer or admin to change this one.",
    );
  }
}

/** State assigned when an entry is first created. */
export function creationState(actor) {
  if (isAdmin(actor)) return REVIEW_STATES.APPROVED;
  if (isModerator(actor)) return REVIEW_STATES.REVIEWER_APPROVED;
  return REVIEW_STATES.DRAFT;
}

export function creationAction(state) {
  if (state === REVIEW_STATES.APPROVED) return "created_approved";
  if (state === REVIEW_STATES.REVIEWER_APPROVED) return "created_reviewer_approved";
  return "draft_created";
}

/**
 * Contributor edits stay drafts until submitted; submitted edits return to
 * pending. Reviewer edits need the admin's final approval. Admin edits keep
 * the current state.
 */
export function stateAfterEdit(existing, actor) {
  if (isAdmin(actor)) return existing.reviewStateCode;
  if (isModerator(actor)) return REVIEW_STATES.REVIEWER_APPROVED;

  return existing.reviewStateCode === REVIEW_STATES.DRAFT
    ? REVIEW_STATES.DRAFT
    : REVIEW_STATES.PENDING;
}

/** State produced by an approve/reject decision. */
export function reviewStateFor(decision, actor) {
  if (decision === "approve") {
    return isAdmin(actor) ? REVIEW_STATES.APPROVED : REVIEW_STATES.REVIEWER_APPROVED;
  }
  return REVIEW_STATES.REJECTED;
}

/** Audit action name for a review decision. */
export function reviewActionFor(decision, actor) {
  if (decision !== "approve") return "rejected";
  return isAdmin(actor) ? "approved" : "reviewer_approved";
}

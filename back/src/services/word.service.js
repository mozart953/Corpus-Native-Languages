import { prisma } from "../config/database.js";
import { wordRepository } from "../repositories/word.repository.js";
import { languageRepository } from "../repositories/language.repository.js";
import { REVIEW_STATES, toLanguageResponse } from "../models/language.model.js";
import { WORD_SORT_FIELDS, toWordResponse } from "../models/word.model.js";
import { ApiError } from "../utils/ApiError.js";
import { getPagination, buildMeta } from "../utils/pagination.js";
import { auditService } from "./audit.service.js";

const PUBLIC_WHERE = {
  reviewState: REVIEW_STATES.APPROVED,
  deletedAt: null,
  language: {
    reviewState: REVIEW_STATES.APPROVED,
    deletedAt: null,
  },
};

function requireActor(actor) {
  if (!actor) throw ApiError.unauthorized();
}

function isModerator(actor) {
  return actor.role === "admin" || actor.role === "reviewer";
}

function assertCanEdit(existing, actor) {
  if (actor.role === "admin") return;

  if (actor.role === "reviewer") {
    if (existing.reviewState === REVIEW_STATES.APPROVED) {
      throw ApiError.forbidden("Only an admin can change approved content.");
    }
    return;
  }

  if (existing.createdById !== actor.id) {
    throw ApiError.forbidden(
      "Contributors can only edit entries they created. Ask a reviewer or admin to change this one.",
    );
  }
}

/** State assigned when an entry is first created. */
function creationState(actor) {
  if (actor.role === "admin") return REVIEW_STATES.APPROVED;
  if (actor.role === "reviewer") return REVIEW_STATES.REVIEWER_APPROVED;
  return REVIEW_STATES.DRAFT;
}

function creationAction(state) {
  if (state === REVIEW_STATES.APPROVED) return "created_approved";
  if (state === REVIEW_STATES.REVIEWER_APPROVED) return "created_reviewer_approved";
  return "draft_created";
}

/**
 * Contributor edits stay drafts until submitted; submitted edits return to
 * pending. Reviewer edits need the admin's final approval. Admin edits keep
 * the current state.
 */
function stateAfterEdit(existing, actor) {
  if (actor.role === "admin") return existing.reviewState;
  if (actor.role === "reviewer") return REVIEW_STATES.REVIEWER_APPROVED;
  return existing.reviewState === REVIEW_STATES.DRAFT
    ? REVIEW_STATES.DRAFT
    : REVIEW_STATES.PENDING;
}

function orderByFrom({ sort, direction }) {
  const field = WORD_SORT_FIELDS[sort] ?? "createdAt";
  return { [field]: direction === "desc" ? "desc" : "asc" };
}

function parseVerified(value) {
  if (value === undefined || value === "") return undefined;
  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;
  return undefined;
}

async function assertLanguageIsUsable(languageId, client = prisma) {
  const language = await languageRepository.findById(languageId, client);
  if (!language || language.deletedAt) {
    throw ApiError.badRequest("The selected language does not exist or has been removed.");
  }
  return language;
}

function clearRemovalRequest() {
  return {
    removalRequestedAt: null,
    removalRequestedById: null,
    removalRequestReason: null,
  };
}

export const wordService = {
  async listPublic({ page, limit, q, languageId, partOfSpeech, verified, sort, direction } = {}) {
    const pagination = getPagination({ page, limit });
    const where = { ...PUBLIC_WHERE };

    if (languageId) where.languageId = languageId;
    if (partOfSpeech) where.partOfSpeech = partOfSpeech;

    const verifiedFilter = parseVerified(verified);
    if (verifiedFilter !== undefined) where.verified = verifiedFilter;

    if (q) {
      where.OR = [
        { word: { contains: q } },
        { translation: { contains: q } },
        { pronunciation: { contains: q } },
        { usage: { contains: q } },
      ];
    }

    const [rows, total] = await Promise.all([
      wordRepository.findMany({
        where,
        orderBy: orderByFrom({ sort, direction }),
        skip: pagination.skip,
        take: pagination.take,
      }),
      wordRepository.count(where),
    ]);

    return {
      data: rows.map(toWordResponse),
      meta: buildMeta({
        page: pagination.page,
        limit: pagination.limit,
        total,
      }),
    };
  },

  async getPublic(id) {
    const word = await wordRepository.findById(id);
    if (
      !word ||
      word.deletedAt ||
      word.reviewState !== REVIEW_STATES.APPROVED ||
      !word.language ||
      word.language.deletedAt ||
      word.language.reviewState !== REVIEW_STATES.APPROVED
    ) {
      throw ApiError.notFound("Word not found.");
    }
    return { data: toWordResponse(word) };
  },

  async listMine(actor, { page, limit } = {}) {
    requireActor(actor);
    const pagination = getPagination({ page, limit });
    const where = { createdById: actor.id, deletedAt: null };

    const [rows, total] = await Promise.all([
      wordRepository.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip: pagination.skip,
        take: pagination.take,
      }),
      wordRepository.count(where),
    ]);

    return {
      data: rows.map(toWordResponse),
      meta: buildMeta({
        page: pagination.page,
        limit: pagination.limit,
        total,
      }),
    };
  },

  async listTrash(actor, { page, limit } = {}) {
    requireActor(actor);
    const pagination = getPagination({ page, limit });
    const where = {
      createdById: actor.id,
      deletedAt: { not: null },
      reviewState: REVIEW_STATES.DRAFT,
    };

    const [rows, total] = await Promise.all([
      wordRepository.findMany({
        where,
        orderBy: { deletedAt: "desc" },
        skip: pagination.skip,
        take: pagination.take,
      }),
      wordRepository.count(where),
    ]);

    return {
      data: rows.map(toWordResponse),
      meta: buildMeta({
        page: pagination.page,
        limit: pagination.limit,
        total,
      }),
    };
  },

  async listRemoved({ page, limit, q } = {}) {
    const pagination = getPagination({ page, limit });
    const where = {
      deletedAt: { not: null },
      reviewState: REVIEW_STATES.REMOVED,
    };
    if (q) {
      where.OR = [
        { word: { contains: q } },
        { translation: { contains: q } },
        { deletionReason: { contains: q } },
      ];
    }

    const [rows, total] = await Promise.all([
      wordRepository.findMany({
        where,
        orderBy: { deletedAt: "desc" },
        skip: pagination.skip,
        take: pagination.take,
      }),
      wordRepository.count(where),
    ]);

    return {
      data: rows.map(toWordResponse),
      meta: buildMeta({
        page: pagination.page,
        limit: pagination.limit,
        total,
      }),
    };
  },

  async listRemovalRequests({ page, limit, languageId } = {}) {
    const pagination = getPagination({ page, limit });
    const where = {
      deletedAt: null,
      removalRequestedAt: { not: null },
    };
    if (languageId) where.languageId = languageId;

    const [rows, total] = await Promise.all([
      wordRepository.findMany({
        where,
        orderBy: { removalRequestedAt: "asc" },
        skip: pagination.skip,
        take: pagination.take,
      }),
      wordRepository.count(where),
    ]);

    return {
      data: rows.map(toWordResponse),
      meta: buildMeta({
        page: pagination.page,
        limit: pagination.limit,
        total,
      }),
    };
  },

  async create(input, actor) {
    requireActor(actor);

    await assertLanguageIsUsable(input.languageId);

    const id = input.id?.trim();
    if (id) {
      const existing = await wordRepository.findById(id);
      if (existing) throw ApiError.conflict("A word with that id already exists.");
    }

    const reviewState = creationState(actor);

    const created = await prisma.$transaction(async (tx) => {
      const word = await wordRepository.create(
        {
          ...(id ? { id } : {}),
          languageId: input.languageId,
          word: input.word,
          translation: input.translation,
          pronunciation: input.pronunciation || null,
          partOfSpeech: input.partOfSpeech || null,
          usage: input.usage || null,
          reviewState,
          verified: false,
          createdById: actor.id,
        },
        tx,
      );

      await auditService.record(
        {
          entityType: "word",
          entityId: word.id,
          action: creationAction(reviewState),
          toState: reviewState,
          actor,
          snapshot: word,
        },
        tx,
      );

      return word;
    });

    return { data: toWordResponse(created) };
  },

  async update(id, payload, actor) {
    requireActor(actor);

    const existing = await wordRepository.findById(id);
    if (!existing || existing.deletedAt) throw ApiError.notFound("Word not found.");

    assertCanEdit(existing, actor);

    if (payload.languageId && payload.languageId !== existing.languageId) {
      await assertLanguageIsUsable(payload.languageId);
    }

    const isAdmin = actor.role === "admin";
    const nextState = stateAfterEdit(existing, actor);
    const { id: _ignored, ...fields } = payload;

    const data = { ...fields, ...clearRemovalRequest() };
    for (const field of ["pronunciation", "partOfSpeech", "usage"]) {
      if (field in fields) data[field] = fields[field] || null;
    }

    const updated = await prisma.$transaction(async (tx) => {
      const word = await wordRepository.update(
        id,
        {
          ...data,
          reviewState: nextState,
          verified: isAdmin ? existing.verified : false,
          rejectionReason: isAdmin ? existing.rejectionReason : null,
          reviewedById: isAdmin ? existing.reviewedById : null,
          reviewedAt: isAdmin ? existing.reviewedAt : null,
        },
        tx,
      );

      await auditService.record(
        {
          entityType: "word",
          entityId: id,
          action: isAdmin ? "updated" : "updated_pending",
          fromState: existing.reviewState,
          toState: nextState,
          actor,
          snapshot: word,
        },
        tx,
      );

      return word;
    });

    return { data: toWordResponse(updated) };
  },

  /** Contributor moves their own draft into the review queue. */
  async submit(id, actor) {
    requireActor(actor);

    const existing = await wordRepository.findById(id);
    if (!existing || existing.deletedAt) throw ApiError.notFound("Word not found.");

    if (actor.role !== "admin" && existing.createdById !== actor.id) {
      throw ApiError.forbidden("You can only submit entries you created.");
    }
    if (existing.reviewState !== REVIEW_STATES.DRAFT) {
      throw ApiError.conflict("Only drafts can be submitted for review.");
    }

    await assertLanguageIsUsable(existing.languageId);

    const updated = await prisma.$transaction(async (tx) => {
      const word = await wordRepository.update(
        id,
        {
          reviewState: REVIEW_STATES.PENDING,
          verified: false,
          rejectionReason: null,
          reviewedById: null,
          reviewedAt: null,
          ...clearRemovalRequest(),
        },
        tx,
      );

      await auditService.record(
        {
          entityType: "word",
          entityId: id,
          action: "submitted",
          fromState: REVIEW_STATES.DRAFT,
          toState: REVIEW_STATES.PENDING,
          actor,
          snapshot: word,
        },
        tx,
      );

      return word;
    });

    return { data: toWordResponse(updated) };
  },

  async review(id, { decision, comment }, actor) {
    requireActor(actor);

    if (!isModerator(actor)) {
      throw ApiError.forbidden("Only reviewers and admins can review content.");
    }

    const existing = await wordRepository.findById(id);
    if (!existing || existing.deletedAt) throw ApiError.notFound("Word not found.");

    if (existing.reviewState === REVIEW_STATES.DRAFT) {
      throw ApiError.conflict("Submit the draft before reviewing it.");
    }

    const isAdmin = actor.role === "admin";

    if (!isAdmin && existing.reviewState === REVIEW_STATES.APPROVED) {
      throw ApiError.forbidden("Only an admin can unpublish approved content.");
    }

    let nextState;
    if (decision === "approve") {
      nextState = isAdmin ? REVIEW_STATES.APPROVED : REVIEW_STATES.REVIEWER_APPROVED;
    } else {
      nextState = REVIEW_STATES.REJECTED;
    }

    const updated = await prisma.$transaction(async (tx) => {
      const word = await wordRepository.update(
        id,
        {
          reviewState: nextState,
          verified: nextState === REVIEW_STATES.APPROVED,
          rejectionReason:
            decision === "reject" ? comment || "Rejected during review." : null,
          reviewedById: actor.id,
          reviewedAt: new Date(),
          ...clearRemovalRequest(),
        },
        tx,
      );

      await auditService.record(
        {
          entityType: "word",
          entityId: id,
          action:
            decision === "approve"
              ? isAdmin
                ? "approved"
                : "reviewer_approved"
              : "rejected",
          fromState: existing.reviewState,
          toState: nextState,
          actor,
          reason: comment,
          snapshot: word,
        },
        tx,
      );

      return word;
    });

    return { data: toWordResponse(updated) };
  },

  /**
   * Admin: logical removal. Contributor: move an unpublished draft to the
   * private trash. Reviewers cannot delete; they raise a removal request.
   */
  async remove(id, { reason } = {}, actor) {
    requireActor(actor);

    const existing = await wordRepository.findById(id);
    if (!existing) throw ApiError.notFound("Word not found.");
    if (existing.deletedAt) {
      throw ApiError.conflict("That word is already logically removed.");
    }

    if (actor.role !== "admin") {
      if (existing.createdById !== actor.id || existing.reviewState !== REVIEW_STATES.DRAFT) {
        throw ApiError.forbidden(
          "Only drafts can be discarded. Ask a reviewer to request removal of submitted content.",
        );
      }

      const discarded = await prisma.$transaction(async (tx) => {
        const word = await wordRepository.discardDraft(
          id,
          { deletedById: actor.id, reason },
          tx,
        );

        await auditService.record(
          {
            entityType: "word",
            entityId: id,
            action: "draft_discarded",
            fromState: REVIEW_STATES.DRAFT,
            toState: REVIEW_STATES.DRAFT,
            actor,
            reason,
            snapshot: word,
          },
          tx,
        );

        return word;
      });

      return { data: toWordResponse(discarded) };
    }

    const removed = await prisma.$transaction(async (tx) => {
      const word = await wordRepository.softDelete(
        id,
        { deletedById: actor.id, reason },
        tx,
      );

      await auditService.record(
        {
          entityType: "word",
          entityId: id,
          action: "removed",
          fromState: existing.reviewState,
          toState: REVIEW_STATES.REMOVED,
          actor,
          reason,
          snapshot: word,
        },
        tx,
      );

      return word;
    });

    return { data: toWordResponse(removed) };
  },

  async restore(id, actor) {
    requireActor(actor);

    const existing = await wordRepository.findById(id);
    if (!existing) throw ApiError.notFound("Word not found.");
    if (!existing.deletedAt) {
      throw ApiError.conflict("That word is not removed.");
    }

    const isAdmin = actor.role === "admin";
    const isOwnDraft =
      existing.createdById === actor.id &&
      existing.reviewState === REVIEW_STATES.DRAFT;

    if (!isAdmin && !isOwnDraft) {
      throw ApiError.forbidden("Only admins can restore removed content.");
    }

    const restored = await prisma.$transaction(async (tx) => {
      const word = isAdmin && existing.reviewState === REVIEW_STATES.REMOVED
        ? await wordRepository.restore(id, tx)
        : await wordRepository.restoreDraft(id, tx);

      await auditService.record(
        {
          entityType: "word",
          entityId: id,
          action: isOwnDraft ? "draft_restored" : "restored",
          fromState: existing.reviewState,
          toState: word.reviewState,
          actor,
          snapshot: word,
        },
        tx,
      );

      return word;
    });

    return { data: toWordResponse(restored) };
  },

  async requestRemoval(id, { reason } = {}, actor) {
    requireActor(actor);
    if (!isModerator(actor)) {
      throw ApiError.forbidden("Only reviewers and admins can request removal.");
    }

    const existing = await wordRepository.findById(id);
    if (!existing || existing.deletedAt) throw ApiError.notFound("Word not found.");
    if (existing.reviewState === REVIEW_STATES.DRAFT) {
      throw ApiError.conflict("Drafts are not published; ask the contributor to discard it.");
    }
    if (existing.removalRequestedAt) {
      throw ApiError.conflict("A removal request already exists for this word.");
    }

    const updated = await prisma.$transaction(async (tx) => {
      const word = await wordRepository.setRemovalRequest(
        id,
        { actorId: actor.id, reason },
        tx,
      );

      await auditService.record(
        {
          entityType: "word",
          entityId: id,
          action: "removal_requested",
          fromState: existing.reviewState,
          toState: existing.reviewState,
          actor,
          reason,
          snapshot: word,
        },
        tx,
      );

      return word;
    });

    return { data: toWordResponse(updated) };
  },

  async cancelRemovalRequest(id, actor) {
    requireActor(actor);
    if (!isModerator(actor)) {
      throw ApiError.forbidden("Only reviewers and admins can cancel removal requests.");
    }

    const existing = await wordRepository.findById(id);
    if (!existing || existing.deletedAt) throw ApiError.notFound("Word not found.");
    if (!existing.removalRequestedAt) {
      throw ApiError.conflict("There is no removal request for this word.");
    }

    const updated = await prisma.$transaction(async (tx) => {
      const word = await wordRepository.clearRemovalRequest(id, tx);

      await auditService.record(
        {
          entityType: "word",
          entityId: id,
          action: "removal_request_cancelled",
          fromState: existing.reviewState,
          toState: existing.reviewState,
          actor,
          snapshot: word,
        },
        tx,
      );

      return word;
    });

    return { data: toWordResponse(updated) };
  },

  // Exposed for the review queue, which needs to show both languages and
  // words that are waiting for a decision.
  async listForQueue({ page, limit, languageId } = {}) {
    const pagination = getPagination({ page, limit });
    const where = {
      deletedAt: null,
      reviewState: {
        in: [REVIEW_STATES.PENDING, REVIEW_STATES.REVIEWER_APPROVED],
      },
    };
    if (languageId) where.languageId = languageId;

    const [rows, total] = await Promise.all([
      wordRepository.findMany({
        where,
        orderBy: { createdAt: "asc" },
        skip: pagination.skip,
        take: pagination.take,
      }),
      wordRepository.count(where),
    ]);

    return {
      data: rows.map(toWordResponse),
      meta: buildMeta({
        page: pagination.page,
        limit: pagination.limit,
        total,
      }),
    };
  },

  async listLanguagesForQueue({ page, limit } = {}) {
    const pagination = getPagination({ page, limit });
    const where = {
      deletedAt: null,
      reviewState: {
        in: [REVIEW_STATES.PENDING, REVIEW_STATES.REVIEWER_APPROVED],
      },
    };

    const [rows, total] = await Promise.all([
      languageRepository.findMany({
        where,
        orderBy: { createdAt: "asc" },
        skip: pagination.skip,
        take: pagination.take,
      }),
      languageRepository.count(where),
    ]);

    return {
      data: rows.map(toLanguageResponse),
      meta: buildMeta({
        page: pagination.page,
        limit: pagination.limit,
        total,
      }),
    };
  },
};

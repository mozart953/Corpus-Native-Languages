import { prisma } from "../config/database.js";
import { languageRepository } from "../repositories/language.repository.js";
import {
  LANGUAGE_STATUSES,
  LANGUAGE_SORT_FIELDS,
  REVIEW_STATES,
  toLanguageResponse,
} from "../models/language.model.js";
import { ApiError } from "../utils/ApiError.js";
import { getPagination, buildMeta } from "../utils/pagination.js";
import { slugify } from "../utils/slugify.js";
import { auditService } from "./audit.service.js";

const PUBLIC_WHERE = {
  reviewState: REVIEW_STATES.APPROVED,
  deletedAt: null,
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

function stateAfterEdit(existing, actor) {
  if (actor.role === "admin") return existing.reviewState;
  if (actor.role === "reviewer") return REVIEW_STATES.REVIEWER_APPROVED;
  return existing.reviewState === REVIEW_STATES.DRAFT
    ? REVIEW_STATES.DRAFT
    : REVIEW_STATES.PENDING;
}

function orderByFrom({ sort, direction }) {
  const field = LANGUAGE_SORT_FIELDS[sort] ?? "name";
  return { [field]: direction === "desc" ? "desc" : "asc" };
}

function clearRemovalRequest() {
  return {
    removalRequestedAt: null,
    removalRequestedById: null,
    removalRequestReason: null,
  };
}

export const languageService = {
  async listPublic({ page, limit, q, status, sort, direction } = {}) {
    const pagination = getPagination({ page, limit });
    const where = { ...PUBLIC_WHERE };

    if (status && LANGUAGE_STATUSES.includes(status)) where.status = status;

    if (q) {
      where.OR = [
        { name: { contains: q } },
        { autonym: { contains: q } },
        { region: { contains: q } },
      ];
    }

    const [rows, total] = await Promise.all([
      languageRepository.findMany({
        where,
        orderBy: orderByFrom({ sort, direction }),
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

  async getPublic(id) {
    const language = await languageRepository.findById(id);
    if (
      !language ||
      language.deletedAt ||
      language.reviewState !== REVIEW_STATES.APPROVED
    ) {
      throw ApiError.notFound("Language not found.");
    }
    return { data: toLanguageResponse(language) };
  },

  async listMine(actor, { page, limit } = {}) {
    requireActor(actor);
    const pagination = getPagination({ page, limit });
    const where = { createdById: actor.id, deletedAt: null };

    const [rows, total] = await Promise.all([
      languageRepository.findMany({
        where,
        orderBy: { updatedAt: "desc" },
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

  async listTrash(actor, { page, limit } = {}) {
    requireActor(actor);
    const pagination = getPagination({ page, limit });
    const where = {
      createdById: actor.id,
      deletedAt: { not: null },
      reviewState: REVIEW_STATES.DRAFT,
    };

    const [rows, total] = await Promise.all([
      languageRepository.findMany({
        where,
        orderBy: { deletedAt: "desc" },
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

  async listRemoved({ page, limit, q } = {}) {
    const pagination = getPagination({ page, limit });
    const where = {
      deletedAt: { not: null },
      reviewState: REVIEW_STATES.REMOVED,
    };
    if (q) {
      where.OR = [
        { name: { contains: q } },
        { autonym: { contains: q } },
        { region: { contains: q } },
        { deletionReason: { contains: q } },
      ];
    }

    const [rows, total] = await Promise.all([
      languageRepository.findMany({
        where,
        orderBy: { deletedAt: "desc" },
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

  async listRemovalRequests({ page, limit } = {}) {
    const pagination = getPagination({ page, limit });
    const where = {
      deletedAt: null,
      removalRequestedAt: { not: null },
    };

    const [rows, total] = await Promise.all([
      languageRepository.findMany({
        where,
        orderBy: { removalRequestedAt: "asc" },
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

  async create(input, actor) {
    requireActor(actor);

    const id = input.id?.trim() || slugify(input.name);
    if (!id) throw ApiError.badRequest("A language id or name is required.");

    const existing = await languageRepository.findById(id);
    if (existing) {
      throw ApiError.conflict("A language with that id already exists.");
    }

    const reviewState = creationState(actor);

    const created = await prisma.$transaction(async (tx) => {
      const language = await languageRepository.create(
        {
          id,
          name: input.name,
          autonym: input.autonym,
          region: input.region,
          speakers: input.speakers,
          words: input.words ?? 0,
          status: input.status ?? "active",
          accent: input.accent ?? "#2f8bff",
          reviewState,
          verified: false,
          createdById: actor.id,
        },
        tx,
      );

      await auditService.record(
        {
          entityType: "language",
          entityId: language.id,
          action: creationAction(reviewState),
          toState: reviewState,
          actor,
          snapshot: language,
        },
        tx,
      );

      return language;
    });

    return { data: toLanguageResponse(created) };
  },

  async update(id, payload, actor) {
    requireActor(actor);

    const existing = await languageRepository.findById(id);
    if (!existing || existing.deletedAt) throw ApiError.notFound("Language not found.");

    assertCanEdit(existing, actor);

    const isAdmin = actor.role === "admin";
    const nextState = stateAfterEdit(existing, actor);

    const { id: _ignored, ...fields } = payload;

    const updated = await prisma.$transaction(async (tx) => {
      const language = await languageRepository.update(
        id,
        {
          ...fields,
          ...clearRemovalRequest(),
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
          entityType: "language",
          entityId: id,
          action: isAdmin ? "updated" : "updated_pending",
          fromState: existing.reviewState,
          toState: nextState,
          actor,
          snapshot: language,
        },
        tx,
      );

      return language;
    });

    return { data: toLanguageResponse(updated) };
  },

  async submit(id, actor) {
    requireActor(actor);

    const existing = await languageRepository.findById(id);
    if (!existing || existing.deletedAt) throw ApiError.notFound("Language not found.");

    if (actor.role !== "admin" && existing.createdById !== actor.id) {
      throw ApiError.forbidden("You can only submit entries you created.");
    }
    if (existing.reviewState !== REVIEW_STATES.DRAFT) {
      throw ApiError.conflict("Only drafts can be submitted for review.");
    }

    const updated = await prisma.$transaction(async (tx) => {
      const language = await languageRepository.update(
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
          entityType: "language",
          entityId: id,
          action: "submitted",
          fromState: REVIEW_STATES.DRAFT,
          toState: REVIEW_STATES.PENDING,
          actor,
          snapshot: language,
        },
        tx,
      );

      return language;
    });

    return { data: toLanguageResponse(updated) };
  },

  async review(id, { decision, comment }, actor) {
    requireActor(actor);

    if (!isModerator(actor)) {
      throw ApiError.forbidden("Only reviewers and admins can review content.");
    }

    const existing = await languageRepository.findById(id);
    if (!existing || existing.deletedAt) throw ApiError.notFound("Language not found.");

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
      const language = await languageRepository.update(
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
          entityType: "language",
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
          snapshot: language,
        },
        tx,
      );

      return language;
    });

    return { data: toLanguageResponse(updated) };
  },

  async remove(id, { reason } = {}, actor) {
    requireActor(actor);

    const existing = await languageRepository.findById(id);
    if (!existing) throw ApiError.notFound("Language not found.");
    if (existing.deletedAt) {
      throw ApiError.conflict("That language is already logically removed.");
    }

    if (actor.role !== "admin") {
      if (existing.createdById !== actor.id || existing.reviewState !== REVIEW_STATES.DRAFT) {
        throw ApiError.forbidden(
          "Only drafts can be discarded. Ask a reviewer to request removal of submitted content.",
        );
      }

      const discarded = await prisma.$transaction(async (tx) => {
        const language = await languageRepository.discardDraft(
          id,
          { deletedById: actor.id, reason },
          tx,
        );

        await auditService.record(
          {
            entityType: "language",
            entityId: id,
            action: "draft_discarded",
            fromState: REVIEW_STATES.DRAFT,
            toState: REVIEW_STATES.DRAFT,
            actor,
            reason,
            snapshot: language,
          },
          tx,
        );

        return language;
      });

      return { data: toLanguageResponse(discarded) };
    }

    const removed = await prisma.$transaction(async (tx) => {
      const language = await languageRepository.softDelete(
        id,
        { deletedById: actor.id, reason },
        tx,
      );

      await auditService.record(
        {
          entityType: "language",
          entityId: id,
          action: "removed",
          fromState: existing.reviewState,
          toState: REVIEW_STATES.REMOVED,
          actor,
          reason,
          snapshot: language,
        },
        tx,
      );

      return language;
    });

    return { data: toLanguageResponse(removed) };
  },

  async restore(id, actor) {
    requireActor(actor);

    const existing = await languageRepository.findById(id);
    if (!existing) throw ApiError.notFound("Language not found.");
    if (!existing.deletedAt) {
      throw ApiError.conflict("That language is not removed.");
    }

    const isAdmin = actor.role === "admin";
    const isOwnDraft =
      existing.createdById === actor.id &&
      existing.reviewState === REVIEW_STATES.DRAFT;

    if (!isAdmin && !isOwnDraft) {
      throw ApiError.forbidden("Only admins can restore removed content.");
    }

    const restored = await prisma.$transaction(async (tx) => {
      const language = isAdmin && existing.reviewState === REVIEW_STATES.REMOVED
        ? await languageRepository.restore(id, tx)
        : await languageRepository.restoreDraft(id, tx);

      await auditService.record(
        {
          entityType: "language",
          entityId: id,
          action: isOwnDraft ? "draft_restored" : "restored",
          fromState: existing.reviewState,
          toState: language.reviewState,
          actor,
          snapshot: language,
        },
        tx,
      );

      return language;
    });

    return { data: toLanguageResponse(restored) };
  },

  async requestRemoval(id, { reason } = {}, actor) {
    requireActor(actor);
    if (!isModerator(actor)) {
      throw ApiError.forbidden("Only reviewers and admins can request removal.");
    }

    const existing = await languageRepository.findById(id);
    if (!existing || existing.deletedAt) throw ApiError.notFound("Language not found.");
    if (existing.reviewState === REVIEW_STATES.DRAFT) {
      throw ApiError.conflict("Drafts are not published; ask the contributor to discard it.");
    }
    if (existing.removalRequestedAt) {
      throw ApiError.conflict("A removal request already exists for this language.");
    }

    const updated = await prisma.$transaction(async (tx) => {
      const language = await languageRepository.setRemovalRequest(
        id,
        { actorId: actor.id, reason },
        tx,
      );

      await auditService.record(
        {
          entityType: "language",
          entityId: id,
          action: "removal_requested",
          fromState: existing.reviewState,
          toState: existing.reviewState,
          actor,
          reason,
          snapshot: language,
        },
        tx,
      );

      return language;
    });

    return { data: toLanguageResponse(updated) };
  },

  async cancelRemovalRequest(id, actor) {
    requireActor(actor);
    if (!isModerator(actor)) {
      throw ApiError.forbidden("Only reviewers and admins can cancel removal requests.");
    }

    const existing = await languageRepository.findById(id);
    if (!existing || existing.deletedAt) throw ApiError.notFound("Language not found.");
    if (!existing.removalRequestedAt) {
      throw ApiError.conflict("There is no removal request for this language.");
    }

    const updated = await prisma.$transaction(async (tx) => {
      const language = await languageRepository.clearRemovalRequest(id, tx);

      await auditService.record(
        {
          entityType: "language",
          entityId: id,
          action: "removal_request_cancelled",
          fromState: existing.reviewState,
          toState: existing.reviewState,
          actor,
          snapshot: language,
        },
        tx,
      );

      return language;
    });

    return { data: toLanguageResponse(updated) };
  },
};

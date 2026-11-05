import { asyncHandler } from "../utils/async-handler.js";
import { wordService } from "../services/word.service.js";

export const wordController = {
  list: asyncHandler(async (req, res) => {
    res.json(await wordService.listPublic(req.validated));
  }),

  get: asyncHandler(async (req, res) => {
    res.json(await wordService.getPublic(req.validated.id));
  }),

  listMine: asyncHandler(async (req, res) => {
    res.json(await wordService.listMine(req.user, req.validated));
  }),

  create: asyncHandler(async (req, res) => {
    res.status(201).json(await wordService.create(req.validated, req.user));
  }),

  update: asyncHandler(async (req, res) => {
    const { id, ...payload } = req.validated;
    res.json(await wordService.update(id, payload, req.user));
  }),

  remove: asyncHandler(async (req, res) => {
    const { id, reason } = req.validated;
    res.json(await wordService.remove(id, { reason }, req.user));
  }),

  restore: asyncHandler(async (req, res) => {
    res.json(await wordService.restore(req.validated.id, req.user));
  }),

  review: asyncHandler(async (req, res) => {
    const { id, decision, comment } = req.validated;
    res.json(await wordService.review(id, { decision, comment }, req.user));
  }),
};

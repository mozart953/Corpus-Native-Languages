import { asyncHandler } from "../utils/async-handler.js";
import { languageService } from "../services/language.service.js";

export const languageController = {
  list: asyncHandler(async (req, res) => {
    res.json(await languageService.listPublic(req.validated));
  }),

  get: asyncHandler(async (req, res) => {
    res.json(await languageService.getPublic(req.validated.id));
  }),

  listMine: asyncHandler(async (req, res) => {
    res.json(await languageService.listMine(req.user, req.validated));
  }),

  listTrash: asyncHandler(async (req, res) => {
    res.json(await languageService.listTrash(req.user, req.validated));
  }),

  submit: asyncHandler(async (req, res) => {
    res.json(await languageService.submit(req.validated.id, req.user));
  }),

  create: asyncHandler(async (req, res) => {
    res.status(201).json(await languageService.create(req.validated, req.user));
  }),

  update: asyncHandler(async (req, res) => {
    const { id, ...payload } = req.validated;
    res.json(await languageService.update(id, payload, req.user));
  }),

  remove: asyncHandler(async (req, res) => {
    const { id, reason } = req.validated;
    res.json(await languageService.remove(id, { reason }, req.user));
  }),

  restore: asyncHandler(async (req, res) => {
    res.json(await languageService.restore(req.validated.id, req.user));
  }),

  review: asyncHandler(async (req, res) => {
    const { id, decision, comment } = req.validated;
    res.json(await languageService.review(id, { decision, comment }, req.user));
  }),

  requestRemoval: asyncHandler(async (req, res) => {
    const { id, reason } = req.validated;
    res.json(await languageService.requestRemoval(id, { reason }, req.user));
  }),

  cancelRemovalRequest: asyncHandler(async (req, res) => {
    res.json(await languageService.cancelRemovalRequest(req.validated.id, req.user));
  }),
};

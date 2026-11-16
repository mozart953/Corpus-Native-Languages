import { asyncHandler } from "../utils/async-handler.js";
import { partOfSpeechService } from "../services/part-of-speech.service.js";

export const partOfSpeechController = {
  list: asyncHandler(async (req, res) => {
    res.json(await partOfSpeechService.listPublic(req.validated.locale));
  }),

  listAdmin: asyncHandler(async (req, res) => {
    res.json(await partOfSpeechService.listAdmin(req.validated.locale));
  }),

  create: asyncHandler(async (req, res) => {
    res.status(201).json(await partOfSpeechService.create(req.validated, req.user));
  }),

  update: asyncHandler(async (req, res) => {
    const { code, ...payload } = req.validated;
    res.json(await partOfSpeechService.update(code, payload, req.user));
  }),

  deactivate: asyncHandler(async (req, res) => {
    res.json(await partOfSpeechService.deactivate(req.validated.code, req.user));
  }),

  activate: asyncHandler(async (req, res) => {
    res.json(await partOfSpeechService.activate(req.validated.code, req.user));
  }),
};

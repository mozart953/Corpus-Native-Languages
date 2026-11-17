import { asyncHandler } from "../utils/async-handler.js";
import { accountService } from "../services/account.service.js";

export const accountController = {
  get: asyncHandler(async (req, res) => {
    res.json(await accountService.getAccount(req.user));
  }),

  changeUsername: asyncHandler(async (req, res) => {
    res.json(await accountService.changeUsername(req.validated, req.user));
  }),

  changeEmail: asyncHandler(async (req, res) => {
    res.json(await accountService.changeEmail(req.validated, req.user));
  }),

  changePassword: asyncHandler(async (req, res) => {
    res.json(await accountService.changePassword(req.validated, req.user));
  }),

  listOwnRequests: asyncHandler(async (req, res) => {
    res.json(await accountService.listOwnRequests(req.user));
  }),

  createRequest: asyncHandler(async (req, res) => {
    res.status(201).json(await accountService.createRequest(req.validated, req.user));
  }),

  cancelRequest: asyncHandler(async (req, res) => {
    res.json(
      await accountService.cancelRequest(req.validated.id, req.user),
    );
  }),

  listRequests: asyncHandler(async (req, res) => {
    res.json(await accountService.listRequests(req.validated, req.user));
  }),

  adminUpdateUser: asyncHandler(async (req, res) => {
    const { id, ...payload } = req.validated;
    res.json(await accountService.adminUpdateUser(id, payload, req.user));
  }),
};

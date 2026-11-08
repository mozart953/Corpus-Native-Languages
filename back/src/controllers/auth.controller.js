import { asyncHandler } from "../utils/async-handler.js";
import { authService } from "../services/auth.service.js";

export const authController = {
  register: asyncHandler(async (req, res) => {
    res.status(201).json(await authService.register(req.validated));
  }),

  login: asyncHandler(async (req, res) => {
    res.json(await authService.login(req.validated));
  }),

  me: asyncHandler(async (req, res) => {
    res.json(await authService.me(req.user));
  }),
};

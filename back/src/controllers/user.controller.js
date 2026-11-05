import { asyncHandler } from "../utils/async-handler.js";
import { userService } from "../services/user.service.js";

export const userController = {
  list: asyncHandler(async (req, res) => {
    res.json(await userService.list(req.validated));
  }),

  updateRole: asyncHandler(async (req, res) => {
    const { id, role } = req.validated;
    res.json(await userService.updateRole(id, role, req.user));
  }),
};

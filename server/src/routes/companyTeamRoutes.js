import { Router } from "express";
import {
  acceptCompanyInvite,
  createCompanyInvite,
  listCompanyInvites,
  listCompanyTeamMembers,
  removeCompanyTeamMember,
  revokeCompanyInvite,
  updateCompanyTeamMemberRole
} from "../controllers/companyTeamController.js";
import { protect, requireRole } from "../middleware/auth.js";

const router = Router();

router.post("/invites/accept", acceptCompanyInvite);

router.use(protect, requireRole("company"));

router.get("/members", listCompanyTeamMembers);
router.get("/invites", listCompanyInvites);
router.post("/invites", createCompanyInvite);
router.patch("/invites/:inviteId/revoke", revokeCompanyInvite);
router.patch("/members/:memberId/role", updateCompanyTeamMemberRole);
router.delete("/members/:memberId", removeCompanyTeamMember);

export default router;

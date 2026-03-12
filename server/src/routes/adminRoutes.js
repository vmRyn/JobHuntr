import { Router } from "express";
import {
  getAdminOverview,
  getAuditLogs,
  listCompanies,
  listJobs,
  setCompanyVerification,
  setJobStatus,
  setUserSuspension
} from "../controllers/adminController.js";
import { protect, requireRole } from "../middleware/auth.js";

const router = Router();

router.use(protect, requireRole("admin"));

router.get("/overview", getAdminOverview);
router.get("/companies", listCompanies);
router.patch("/companies/:companyId/verification", setCompanyVerification);
router.patch("/users/:userId/suspension", setUserSuspension);
router.get("/jobs", listJobs);
router.patch("/jobs/:jobId/status", setJobStatus);
router.get("/audit-logs", getAuditLogs);

export default router;

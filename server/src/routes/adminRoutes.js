import { Router } from "express";
import {
  getAdminOverview,
  getAuditLogs,
  listAppeals,
  listCompanies,
  listFlaggedMessages,
  listJobs,
  listReports,
  moderateMessage,
  reviewAppeal,
  reviewReport,
  setCompanyVerification,
  setJobModeration,
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
router.patch("/jobs/:jobId/moderation", setJobModeration);

router.get("/reports", listReports);
router.patch("/reports/:reportId", reviewReport);

router.get("/appeals", listAppeals);
router.patch("/appeals/:appealId", reviewAppeal);

router.get("/messages/flagged", listFlaggedMessages);
router.patch("/messages/:messageId/moderation", moderateMessage);

router.get("/audit-logs", getAuditLogs);

export default router;

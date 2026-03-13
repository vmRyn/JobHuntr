import { Router } from "express";
import {
  addMySupportTicketMessage,
  addSupportTicketReplyAsAdmin,
  chatSupportAssistant,
  createSupportTicket,
  getMySupportTicketById,
  getMySupportTickets,
  getSupportTicketForAdmin,
  listSupportTicketsForAdmin,
  updateSupportTicketStatusAsAdmin
} from "../controllers/supportController.js";
import { protect, requireRole } from "../middleware/auth.js";

const router = Router();

router.use(protect);

router.post("/chatbot", chatSupportAssistant);
router.get("/tickets", getMySupportTickets);
router.post("/tickets", createSupportTicket);
router.get("/tickets/:ticketId", getMySupportTicketById);
router.post("/tickets/:ticketId/messages", addMySupportTicketMessage);

router.get("/admin/tickets", requireRole("admin"), listSupportTicketsForAdmin);
router.get("/admin/tickets/:ticketId", requireRole("admin"), getSupportTicketForAdmin);
router.post("/admin/tickets/:ticketId/reply", requireRole("admin"), addSupportTicketReplyAsAdmin);
router.patch("/admin/tickets/:ticketId/status", requireRole("admin"), updateSupportTicketStatusAsAdmin);

export default router;

import { useEffect, useMemo, useState } from "react";
import api from "../api/client";
import Button from "./ui/Button";
import Card from "./ui/Card";
import InputField from "./ui/InputField";
import SelectField from "./ui/SelectField";

const employmentTypeOptions = [
  { value: "full_time", label: "Full-time" },
  { value: "part_time", label: "Part-time" },
  { value: "contract", label: "Contract" },
  { value: "internship", label: "Internship" },
  { value: "temporary", label: "Temporary" }
];

const toInputDate = (value) => {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
};

const toLocalDate = (value) => {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";

  return parsed.toLocaleDateString([], {
    dateStyle: "medium"
  });
};

const toLocalDateTime = (value) => {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";

  return parsed.toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short"
  });
};

const getErrorMessage = (requestError, fallback) =>
  requestError?.response?.data?.message || fallback;

const defaultOfferForm = {
  title: "Offer",
  compensation: "",
  currency: "USD",
  employmentType: "full_time",
  startDate: "",
  notes: ""
};

const getDisplayName = (actor) => {
  if (!actor || typeof actor !== "object") {
    return "Team";
  }

  if (actor.userType === "company") {
    return actor.companyProfile?.companyName || "Company";
  }

  return actor.seekerProfile?.name || "Candidate";
};

const OfferWorkflowPanel = ({ selectedMatch, currentUser, onNotice, onError }) => {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creatingOffer, setCreatingOffer] = useState(false);
  const [actionOfferId, setActionOfferId] = useState("");
  const [offerForm, setOfferForm] = useState(defaultOfferForm);

  const selectedMatchId = selectedMatch?._id;

  const isCompanyUser = currentUser?.userType === "company";
  const isSeekerUser = currentUser?.userType === "seeker";
  const companyRole = currentUser?.companyAccess?.role || "owner";
  const canManageOffers = isCompanyUser && companyRole !== "viewer";

  const headerSummary = useMemo(() => {
    if (!selectedMatch) {
      return "Select a match";
    }

    const counterpart = isCompanyUser
      ? selectedMatch?.seeker?.seekerProfile?.name || "Candidate"
      : selectedMatch?.company?.companyProfile?.companyName || "Company";

    return `${selectedMatch?.job?.title || "Role"} · ${counterpart}`;
  }, [isCompanyUser, selectedMatch]);

  const loadOffers = async () => {
    if (!selectedMatchId) {
      setOffers([]);
      return;
    }

    setLoading(true);

    try {
      const { data } = await api.get(`/matches/${selectedMatchId}/offers`);
      setOffers(data || []);
    } catch (requestError) {
      onError?.(getErrorMessage(requestError, "Failed to load offers"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setOfferForm(defaultOfferForm);
    loadOffers();
  }, [selectedMatchId]);

  const handleOfferFormChange = (event) => {
    const { name, value } = event.target;
    setOfferForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateOffer = async (event) => {
    event.preventDefault();

    if (!canManageOffers || !selectedMatchId || creatingOffer) {
      return;
    }

    if (!offerForm.compensation.trim()) {
      onError?.("Compensation is required to create an offer.");
      return;
    }

    setCreatingOffer(true);

    try {
      await api.post(`/matches/${selectedMatchId}/offers`, {
        title: offerForm.title,
        compensation: offerForm.compensation,
        currency: offerForm.currency,
        employmentType: offerForm.employmentType,
        startDate: offerForm.startDate || null,
        notes: offerForm.notes
      });

      onNotice?.("Offer created");
      setOfferForm(defaultOfferForm);
      await loadOffers();
    } catch (requestError) {
      onError?.(getErrorMessage(requestError, "Failed to create offer"));
    } finally {
      setCreatingOffer(false);
    }
  };

  const handleUpdateOffer = async (offer) => {
    if (!canManageOffers || !selectedMatchId || !offer?._id) {
      return;
    }

    const compensation = window.prompt("Compensation", offer.compensation || "");
    if (!compensation || !compensation.trim()) {
      return;
    }

    const notes = window.prompt("Notes", offer.notes || "") || "";

    setActionOfferId(offer._id);

    try {
      await api.patch(`/matches/${selectedMatchId}/offers/${offer._id}`, {
        compensation: compensation.trim(),
        notes,
        auditNote: "Offer details updated"
      });

      onNotice?.("Offer updated");
      await loadOffers();
    } catch (requestError) {
      onError?.(getErrorMessage(requestError, "Failed to update offer"));
    } finally {
      setActionOfferId("");
    }
  };

  const handleWithdrawOffer = async (offer) => {
    if (!canManageOffers || !selectedMatchId || !offer?._id) {
      return;
    }

    const decisionNote = window.prompt("Withdrawal note (optional)", "") || "";

    setActionOfferId(offer._id);

    try {
      await api.patch(`/matches/${selectedMatchId}/offers/${offer._id}`, {
        status: "withdrawn",
        decisionNote,
        auditNote: "Offer withdrawn"
      });

      onNotice?.("Offer withdrawn");
      await loadOffers();
    } catch (requestError) {
      onError?.(getErrorMessage(requestError, "Failed to withdraw offer"));
    } finally {
      setActionOfferId("");
    }
  };

  const handleRespondToOffer = async (offer, action) => {
    if (!isSeekerUser || !selectedMatchId || !offer?._id) {
      return;
    }

    const decisionNote =
      window.prompt(
        `${action === "accept" ? "Acceptance" : "Decline"} note (optional)`,
        ""
      ) || "";

    setActionOfferId(offer._id);

    try {
      await api.patch(`/matches/${selectedMatchId}/offers/${offer._id}/respond`, {
        action,
        decisionNote
      });

      onNotice?.(`Offer ${action === "accept" ? "accepted" : "declined"}`);
      await loadOffers();
    } catch (requestError) {
      onError?.(getErrorMessage(requestError, "Failed to respond to offer"));
    } finally {
      setActionOfferId("");
    }
  };

  return (
    <Card className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Offer workflow</p>
          <h3 className="font-display text-xl text-slate-50">Compensation and decisions</h3>
        </div>
        {selectedMatch && <span className="chip chip-accent normal-case tracking-normal">{headerSummary}</span>}
      </div>

      {!selectedMatch && <div className="empty-state">Select a match to manage offers.</div>}

      {selectedMatch && canManageOffers && (
        <form onSubmit={handleCreateOffer} className="surface-subtle grid gap-3 p-4 md:grid-cols-2">
          <InputField
            label="Offer title"
            name="title"
            value={offerForm.title}
            onChange={handleOfferFormChange}
            placeholder="Senior Engineer Offer"
            required
          />
          <InputField
            label="Compensation"
            name="compensation"
            value={offerForm.compensation}
            onChange={handleOfferFormChange}
            placeholder="$120,000"
            required
          />
          <InputField
            label="Currency"
            name="currency"
            value={offerForm.currency}
            onChange={handleOfferFormChange}
            placeholder="USD"
          />
          <SelectField
            label="Employment type"
            name="employmentType"
            value={offerForm.employmentType}
            onChange={handleOfferFormChange}
            options={employmentTypeOptions}
          />
          <InputField
            label="Start date"
            type="date"
            name="startDate"
            value={offerForm.startDate}
            onChange={handleOfferFormChange}
          />
          <InputField
            className="md:col-span-2"
            as="textarea"
            label="Notes"
            name="notes"
            value={offerForm.notes}
            onChange={handleOfferFormChange}
            placeholder="Sign-on details, equity, conditions"
          />
          <Button className="md:col-span-2" type="submit" disabled={creatingOffer}>
            {creatingOffer ? "Creating..." : "Create offer"}
          </Button>
        </form>
      )}

      {selectedMatch && isCompanyUser && !canManageOffers && (
        <div className="empty-state">
          View-only team members cannot create or modify offers.
        </div>
      )}

      {selectedMatch && (
        <div className="space-y-2">
          {loading && <p className="text-sm text-slate-300">Loading offers...</p>}

          {!loading && !offers.length && (
            <div className="empty-state">No offers yet for this match.</div>
          )}

          {!loading &&
            offers.map((offer) => {
              const isPending = offer.status === "pending";
              const canRespond = isSeekerUser && isPending;
              const canEditOrWithdraw = canManageOffers && isPending;

              return (
                <div key={offer._id} className="surface-subtle p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="space-y-1">
                      <p className="text-base font-semibold text-slate-100">{offer.title || "Offer"}</p>
                      <p className="text-sm text-slate-200">
                        {offer.compensation} {offer.currency}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
                        <span>{(offer.employmentType || "full_time").replace("_", " ")}</span>
                        {offer.startDate && <span>• Starts {toLocalDate(offer.startDate)}</span>}
                        <span>• {offer.status.toUpperCase()}</span>
                      </div>
                    </div>

                    <span
                      className={`chip ${
                        offer.status === "accepted"
                          ? "chip-positive"
                          : offer.status === "declined" || offer.status === "withdrawn"
                            ? "chip-negative"
                            : "chip-accent"
                      }`}
                    >
                      {offer.status.toUpperCase()}
                    </span>
                  </div>

                  {offer.notes && <p className="mt-2 text-sm text-slate-300">{offer.notes}</p>}
                  {offer.decisionNote && (
                    <p className="mt-2 text-xs text-slate-300">Decision note: {offer.decisionNote}</p>
                  )}

                  {(canEditOrWithdraw || canRespond) && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {canEditOrWithdraw && (
                        <>
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            disabled={actionOfferId === offer._id}
                            onClick={() => handleUpdateOffer(offer)}
                          >
                            Update
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="danger"
                            disabled={actionOfferId === offer._id}
                            onClick={() => handleWithdrawOffer(offer)}
                          >
                            Withdraw
                          </Button>
                        </>
                      )}

                      {canRespond && (
                        <>
                          <Button
                            type="button"
                            size="sm"
                            disabled={actionOfferId === offer._id}
                            onClick={() => handleRespondToOffer(offer, "accept")}
                          >
                            Accept
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="danger"
                            disabled={actionOfferId === offer._id}
                            onClick={() => handleRespondToOffer(offer, "decline")}
                          >
                            Decline
                          </Button>
                        </>
                      )}
                    </div>
                  )}

                  {Array.isArray(offer.auditTrail) && offer.auditTrail.length > 0 && (
                    <div className="mt-4 space-y-2 rounded-xl border border-white/10 bg-slate-900/55 p-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-300">Audit trail</p>
                      <div className="space-y-1.5">
                        {offer.auditTrail.map((entry, index) => (
                          <p key={`${offer._id}-audit-${index}`} className="text-xs text-slate-300">
                            {toLocalDateTime(entry.createdAt)} • {getDisplayName(entry.actor)} • {entry.action}
                            {entry.note ? ` • ${entry.note}` : ""}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      )}
    </Card>
  );
};

export default OfferWorkflowPanel;

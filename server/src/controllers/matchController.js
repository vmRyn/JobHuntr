import Match from "../models/Match.js";

export const getMyMatches = async (req, res) => {
  try {
    const query =
      req.user.userType === "seeker"
        ? { seeker: req.user._id }
        : { company: req.user._id };

    const matches = await Match.find(query)
      .populate("job", "title location salary requiredSkills")
      .populate("seeker", "userType seekerProfile")
      .populate("company", "userType companyProfile")
      .sort({ updatedAt: -1 });

    return res.json(matches);
  } catch (error) {
    return res.status(500).json({ message: "Failed to load matches" });
  }
};

export const getMatchedCandidateProfile = async (req, res) => {
  try {
    if (req.user.userType !== "company") {
      return res.status(403).json({ message: "Only companies can access candidate profiles" });
    }

    const match = await Match.findOne({
      _id: req.params.matchId,
      company: req.user._id
    })
      .populate("job", "title industry location postcode salary")
      .populate("seeker", "userType seekerProfile");

    if (!match) {
      return res.status(404).json({ message: "Match not found" });
    }

    return res.json({
      matchId: match._id,
      job: match.job,
      seeker: match.seeker
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to load candidate profile" });
  }
};

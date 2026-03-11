import dotenv from "dotenv";
import mongoose from "mongoose";
import connectDB from "../config/db.js";
import Job from "../models/Job.js";
import Match from "../models/Match.js";
import Message from "../models/Message.js";
import Notification from "../models/Notification.js";
import Swipe from "../models/Swipe.js";
import User from "../models/User.js";

dotenv.config();

const COMPANY_PASSWORD = "DemoCompany123!";
const SEEKER_PASSWORD = "DemoSeeker123!";

const createPoint = (lng, lat) => ({
  type: "Point",
  coordinates: [lng, lat]
});

const companySeeds = [
  {
    email: "northstar.talent@demo.jobhuntr.local",
    companyProfile: {
      companyName: "Northstar Labs",
      description: "AI and data infrastructure for modern product teams.",
      industry: "Technology",
      logo: ""
    },
    jobs: [
      {
        title: "Senior Frontend Engineer",
        description:
          "Build premium user journeys with React, TypeScript, and motion-rich design systems.",
        salary: "GBP 75,000 - 95,000",
        industry: "Technology",
        location: "London",
        postcode: "EC1A 1BB",
        coordinates: createPoint(-0.0975, 51.5202),
        requiredSkills: ["React", "TypeScript", "Design Systems", "Accessibility"]
      },
      {
        title: "Product Designer",
        description:
          "Design swipe-first hiring flows and high-conversion mobile-first experiences.",
        salary: "GBP 60,000 - 80,000",
        industry: "Technology",
        location: "Remote UK",
        postcode: "EC2A 4NE",
        coordinates: createPoint(-0.0839, 51.5234),
        requiredSkills: ["Figma", "UX Research", "Prototyping", "Interaction Design"]
      },
      {
        title: "Backend Engineer",
        description:
          "Own APIs, match orchestration, and event-driven messaging services.",
        salary: "GBP 70,000 - 92,000",
        industry: "Technology",
        location: "Manchester",
        postcode: "M1 1AE",
        coordinates: createPoint(-2.2426, 53.4808),
        requiredSkills: ["Node.js", "MongoDB", "Socket.io", "System Design"]
      }
    ]
  },
  {
    email: "pixelforge.hiring@demo.jobhuntr.local",
    companyProfile: {
      companyName: "PixelForge Studio",
      description: "Creative product studio shipping consumer apps at startup speed.",
      industry: "Design",
      logo: ""
    },
    jobs: [
      {
        title: "Mobile App Engineer",
        description:
          "Ship polished mobile interfaces and improve app performance on iOS and Android.",
        salary: "GBP 62,000 - 84,000",
        industry: "Design",
        location: "Bristol",
        postcode: "BS1 5TR",
        coordinates: createPoint(-2.5926, 51.4543),
        requiredSkills: ["React Native", "Performance", "Animations", "Testing"]
      },
      {
        title: "UI Engineer",
        description:
          "Translate Figma into reusable components and maintain visual consistency across products.",
        salary: "GBP 58,000 - 76,000",
        industry: "Design",
        location: "Leeds",
        postcode: "LS1 4AP",
        coordinates: createPoint(-1.5491, 53.8008),
        requiredSkills: ["CSS", "Tailwind", "Design Tokens", "Storybook"]
      },
      {
        title: "Technical Product Manager",
        description:
          "Drive roadmap execution and align engineering, design, and hiring stakeholders.",
        salary: "GBP 68,000 - 90,000",
        industry: "Design",
        location: "London",
        postcode: "W1A 1AA",
        coordinates: createPoint(-0.1438, 51.5154),
        requiredSkills: ["Product Strategy", "Analytics", "Agile", "Stakeholder Management"]
      }
    ]
  },
  {
    email: "harborai.recruit@demo.jobhuntr.local",
    companyProfile: {
      companyName: "Harbor AI",
      description: "Machine learning tools for operations and logistics teams.",
      industry: "Artificial Intelligence",
      logo: ""
    },
    jobs: [
      {
        title: "Machine Learning Engineer",
        description:
          "Train and deploy ML models that optimize forecasting and routing.",
        salary: "GBP 78,000 - 105,000",
        industry: "Artificial Intelligence",
        location: "Cambridge",
        postcode: "CB2 1TN",
        coordinates: createPoint(0.1209, 52.2053),
        requiredSkills: ["Python", "PyTorch", "MLOps", "Feature Engineering"]
      },
      {
        title: "Data Analyst",
        description:
          "Build dashboards and data narratives to support hiring and business decisions.",
        salary: "GBP 48,000 - 65,000",
        industry: "Artificial Intelligence",
        location: "Birmingham",
        postcode: "B1 1BD",
        coordinates: createPoint(-1.9018, 52.4797),
        requiredSkills: ["SQL", "Tableau", "A/B Testing", "Data Storytelling"]
      },
      {
        title: "Site Reliability Engineer",
        description:
          "Scale cloud systems and maintain reliability for real-time messaging services.",
        salary: "GBP 73,000 - 98,000",
        industry: "Artificial Intelligence",
        location: "Remote UK",
        postcode: "SE1 9SG",
        coordinates: createPoint(-0.0993, 51.5055),
        requiredSkills: ["AWS", "Kubernetes", "Observability", "Incident Response"]
      }
    ]
  },
  {
    email: "velocityhealth.careers@demo.jobhuntr.local",
    companyProfile: {
      companyName: "Velocity Health",
      description: "Digital health products improving patient and clinician outcomes.",
      industry: "Healthcare",
      logo: ""
    },
    jobs: [
      {
        title: "Full Stack Engineer",
        description:
          "Develop secure end-to-end health workflows across web and API layers.",
        salary: "GBP 72,000 - 94,000",
        industry: "Healthcare",
        location: "Glasgow",
        postcode: "G2 1AA",
        coordinates: createPoint(-4.2526, 55.8642),
        requiredSkills: ["Node.js", "React", "Security", "REST APIs"]
      },
      {
        title: "QA Automation Engineer",
        description:
          "Own quality strategy and automate test coverage for core hiring journeys.",
        salary: "GBP 55,000 - 74,000",
        industry: "Healthcare",
        location: "Edinburgh",
        postcode: "EH1 1YZ",
        coordinates: createPoint(-3.1883, 55.9533),
        requiredSkills: ["Cypress", "Playwright", "CI/CD", "Test Strategy"]
      },
      {
        title: "DevOps Engineer",
        description:
          "Improve deployment safety, observability, and infrastructure automation.",
        salary: "GBP 70,000 - 92,000",
        industry: "Healthcare",
        location: "London",
        postcode: "SE10 9NF",
        coordinates: createPoint(-0.0077, 51.4826),
        requiredSkills: ["Terraform", "Docker", "Monitoring", "Linux"]
      }
    ]
  }
];

const seekerSeeds = [
  {
    email: "ava.seeker@demo.jobhuntr.local",
    seekerProfile: {
      name: "Ava Patel",
      bio: "Frontend engineer focused on delightful product experiences.",
      skills: ["React", "TypeScript", "Design Systems"],
      industryField: "Technology",
      location: "London, UK"
    }
  },
  {
    email: "liam.seeker@demo.jobhuntr.local",
    seekerProfile: {
      name: "Liam Harris",
      bio: "Backend engineer with distributed systems and API design experience.",
      skills: ["Node.js", "MongoDB", "System Design"],
      industryField: "Technology",
      location: "Manchester, UK"
    }
  },
  {
    email: "mia.seeker@demo.jobhuntr.local",
    seekerProfile: {
      name: "Mia Thompson",
      bio: "Product-minded engineer who enjoys shipping fast and learning quickly.",
      skills: ["React Native", "UX", "Analytics"],
      industryField: "Design",
      location: "Bristol, UK"
    }
  }
];

const collectIds = (docs = []) => docs.map((doc) => doc._id);

const deleteDemoData = async (demoEmails) => {
  const existingUsers = await User.find({ email: { $in: demoEmails } }).select("_id");
  const userIds = collectIds(existingUsers);

  if (!userIds.length) {
    return;
  }

  const existingJobs = await Job.find({ company: { $in: userIds } }).select("_id");
  const jobIds = collectIds(existingJobs);

  const existingMatches = await Match.find({
    $or: [
      { company: { $in: userIds } },
      { seeker: { $in: userIds } },
      { job: { $in: jobIds } }
    ]
  }).select("_id");
  const matchIds = collectIds(existingMatches);

  if (matchIds.length) {
    await Message.deleteMany({ match: { $in: matchIds } });
  }

  await Message.deleteMany({
    $or: [{ sender: { $in: userIds } }, { receiver: { $in: userIds } }]
  });

  await Notification.deleteMany({
    $or: [
      { user: { $in: userIds } },
      { company: { $in: userIds } },
      { job: { $in: jobIds } },
      { match: { $in: matchIds } }
    ]
  });

  await Swipe.deleteMany({
    $or: [
      { swiper: { $in: userIds } },
      { targetUser: { $in: userIds } },
      { targetJob: { $in: jobIds } }
    ]
  });

  if (matchIds.length) {
    await Match.deleteMany({ _id: { $in: matchIds } });
  }

  if (jobIds.length) {
    await Job.deleteMany({ _id: { $in: jobIds } });
  }

  await User.deleteMany({ _id: { $in: userIds } });
};

const seedCompaniesAndJobs = async () => {
  const seeded = [];

  for (const companySeed of companySeeds) {
    const company = await User.create({
      userType: "company",
      email: companySeed.email,
      password: COMPANY_PASSWORD,
      companyProfile: companySeed.companyProfile
    });

    const jobs = await Job.insertMany(
      companySeed.jobs.map((job) => ({
        company: company._id,
        title: job.title,
        description: job.description,
        salary: job.salary,
        industry: job.industry,
        location: job.location,
        postcode: job.postcode,
        coordinates: job.coordinates,
        requiredSkills: job.requiredSkills,
        isActive: true
      }))
    );

    company.jobListings = collectIds(jobs);
    await company.save();

    seeded.push({ company, jobs });
  }

  return seeded;
};

const seedSeekers = async () => {
  const seekers = [];

  for (const seekerSeed of seekerSeeds) {
    const seeker = await User.create({
      userType: "seeker",
      email: seekerSeed.email,
      password: SEEKER_PASSWORD,
      seekerProfile: seekerSeed.seekerProfile
    });

    seekers.push(seeker);
  }

  return seekers;
};

const seedDemoMatches = async (seededCompanies, seededSeekers) => {
  const pairings = [
    { companyIndex: 0, jobIndex: 0, seekerIndex: 0, stage: "screening" },
    { companyIndex: 1, jobIndex: 1, seekerIndex: 1, stage: "new" },
    { companyIndex: 2, jobIndex: 0, seekerIndex: 2, stage: "interview" }
  ];

  for (const pairing of pairings) {
    const companyEntry = seededCompanies[pairing.companyIndex];
    const seeker = seededSeekers[pairing.seekerIndex];

    if (!companyEntry || !seeker) {
      continue;
    }

    const job = companyEntry.jobs[pairing.jobIndex];
    if (!job) {
      continue;
    }

    await Match.create({
      job: job._id,
      company: companyEntry.company._id,
      seeker: seeker._id,
      stage: pairing.stage
    });

    await Swipe.insertMany([
      {
        swiper: seeker._id,
        targetType: "job",
        targetJob: job._id,
        direction: "right"
      },
      {
        swiper: companyEntry.company._id,
        targetType: "candidate",
        targetUser: seeker._id,
        targetJob: job._id,
        direction: "right"
      }
    ]);
  }
};

const printCredentials = () => {
  console.log("\nDemo company accounts (password is shared):");
  companySeeds.forEach((companySeed) => {
    console.log(`- ${companySeed.companyProfile.companyName}: ${companySeed.email} / ${COMPANY_PASSWORD}`);
  });

  console.log("\nDemo seeker accounts (password is shared):");
  seekerSeeds.forEach((seekerSeed) => {
    console.log(`- ${seekerSeed.seekerProfile.name}: ${seekerSeed.email} / ${SEEKER_PASSWORD}`);
  });
};

const main = async () => {
  const demoEmails = [
    ...companySeeds.map((companySeed) => companySeed.email),
    ...seekerSeeds.map((seekerSeed) => seekerSeed.email)
  ];

  await connectDB();
  await deleteDemoData(demoEmails);

  const seededCompanies = await seedCompaniesAndJobs();
  const seededSeekers = await seedSeekers();
  await seedDemoMatches(seededCompanies, seededSeekers);

  const totalJobs = seededCompanies.reduce((count, entry) => count + entry.jobs.length, 0);

  console.log(`\nSeed complete: ${seededCompanies.length} companies, ${seededSeekers.length} seekers, ${totalJobs} jobs.`);
  printCredentials();
};

main()
  .then(async () => {
    await mongoose.disconnect();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error("Demo seed failed:", error);
    await mongoose.disconnect();
    process.exit(1);
  });

import { todayISO } from "../utils/workTime";
import { isoToBS, bsDateToISO, NEPALI_MONTHS, getTodayBS } from "../utils/nepaliCalendar";

export const PROJECT_PRESETS = {
  architecture: {
    id: "architecture",
    name: "Architecture & Design",
    description: "Tailored for architectural firms, interior designers, and construction consultants.",
    leadLabel: "Architect",
    subLeadLabel: "Sub-Architect",
    workLabel: "Project Work",
    stageLabel: "Current Stage",
    typeLabel: "Project Type",
    defaultStages: [
      "Conceptual",
      "3D Modelling",
      "Detail Drawing",
      "Renderings",
      "BOQ",
      "Plinth Level",
      "Construction Ongoing",
      "Site Work",
      "Interior",
      "Handover Complete",
      "Final Payment",
    ],
    defaultWorkCategories: [
      "Residence",
      "Restaurant",
      "Commercial",
      "Hospitality",
      "Lounge / Bar",
      "Banquet",
      "Office / Institutional",
      "Renovation",
    ],
    defaultTypes: ["Site", "Desk", "Site + Desk", "Interior", "Renovation", "Design"],
  },
  software: {
    id: "software",
    name: "Software & Technology",
    description: "Tailored for tech startups, software studios, and product engineering teams.",
    leadLabel: "Tech Lead",
    subLeadLabel: "Contributors",
    workLabel: "Module / Service",
    stageLabel: "Pipeline Stage",
    typeLabel: "Work Mode",
    defaultStages: [
      "Discovery & Specs",
      "Sprint Backlog",
      "In Development",
      "Code Review",
      "QA Testing",
      "Staging",
      "Production Ready",
      "Maintenance",
    ],
    defaultWorkCategories: [
      "Web Application",
      "Mobile App (iOS/Android)",
      "Backend API",
      "Cloud Infrastructure",
      "UI/UX Design",
      "Data Pipeline",
      "DevOps / CI-CD",
    ],
    defaultTypes: ["Remote", "Hybrid", "Onsite", "Sprint", "R&D"],
  },
  general: {
    id: "general",
    name: "General Business & Agency",
    description: "Tailored for creative agencies, consultancies, and general project teams.",
    leadLabel: "Project Lead",
    subLeadLabel: "Team Members",
    workLabel: "Scope / Category",
    stageLabel: "Milestone",
    typeLabel: "Format",
    defaultStages: [
      "Briefing & Kickoff",
      "In Progress",
      "Client Review",
      "Revisions",
      "Approval",
      "Final Delivery",
      "Closed",
    ],
    defaultWorkCategories: [
      "Client Project",
      "Internal Initiative",
      "Consulting",
      "Marketing Campaign",
      "Operations",
    ],
    defaultTypes: ["Client Site", "In-House", "Hybrid", "Milestone Based"],
  },
};

export function getProjectConfig(orgSettings = {}) {
  const presetKey = orgSettings.preset || "architecture";
  const preset = PROJECT_PRESETS[presetKey] || PROJECT_PRESETS.architecture;

  return {
    preset: presetKey,
    enabled: orgSettings.enabled !== false, // default enabled or configurable
    allowEmployeeEdit: orgSettings.allowEmployeeEdit !== false, // allow employee to edit stage & deadline
    leadLabel: orgSettings.leadLabel || preset.leadLabel,
    subLeadLabel: orgSettings.subLeadLabel || preset.subLeadLabel,
    workLabel: orgSettings.workLabel || preset.workLabel,
    stageLabel: orgSettings.stageLabel || preset.stageLabel,
    typeLabel: orgSettings.typeLabel || preset.typeLabel,
    stages: orgSettings.stages?.length ? orgSettings.stages : preset.defaultStages,
    workCategories: orgSettings.workCategories?.length
      ? orgSettings.workCategories
      : preset.defaultWorkCategories,
    types: orgSettings.types?.length ? orgSettings.types : preset.defaultTypes,
  };
}

/**
 * Calculates deadline urgency based on current date vs target deadline string.
 * Supports ISO (YYYY-MM-DD), BS dates (e.g. 2083/4/25 or 2083-04-25),
 * or slash dates (MM/DD/YYYY or DD/MM/YYYY).
 */
export function getDeadlineUrgency(deadlineOrEndDateStr, projectStatus = "Active") {
  const normStatus = (projectStatus || "").trim().toLowerCase();

  if (normStatus === "completed" || normStatus === "complete" || normStatus === "100%") {
    return {
      type: "completed",
      daysLeft: null,
      label: "Completed",
      badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
      dotClass: "bg-emerald-500",
    };
  }

  if (normStatus === "on hold" || normStatus === "paused") {
    return {
      type: "on_hold",
      daysLeft: null,
      label: "On Hold",
      badgeClass: "bg-slate-100 text-slate-600 border-slate-200",
      dotClass: "bg-slate-400",
    };
  }

  if (!deadlineOrEndDateStr || !deadlineOrEndDateStr.trim()) {
    return {
      type: "none",
      daysLeft: null,
      label: "No Deadline",
      badgeClass: "bg-surface-muted text-text-muted border-border-light",
      dotClass: "bg-text-faint",
    };
  }

  const raw = (deadlineOrEndDateStr || "").trim();
  const today = todayISO(); // 'YYYY-MM-DD'
  const todayDate = new Date(today + "T00:00:00");

  let targetDate = null;

  // Check if it's Bikram Sambat (year >= 2000 and <= 2150 with slash or dash)
  const bsMatch = raw.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
  if (bsMatch) {
    const y = parseInt(bsMatch[1], 10);
    const m = parseInt(bsMatch[2], 10);
    const d = parseInt(bsMatch[3], 10);
    if (y >= 2070 && y <= 2120) {
      try {
        const iso = bsDateToISO(y, m, d);
        if (iso) targetDate = new Date(iso + "T00:00:00");
      } catch {
        // fallback
      }
    }
  }

  // Check standard ISO YYYY-MM-DD
  if (!targetDate && /^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    targetDate = new Date(raw + "T00:00:00");
  }

  // Check MM/DD/YYYY or DD/MM/YYYY
  if (!targetDate) {
    const parts = raw.split(/[/.-]/);
    if (parts.length === 3) {
      const p1 = parseInt(parts[0], 10);
      const p2 = parseInt(parts[1], 10);
      const p3 = parseInt(parts[2], 10);
      // If p3 is full year (2026)
      if (p3 > 2000 && p3 < 2050) {
        // Assume MM/DD/YYYY or DD/MM/YYYY
        // Try month <= 12
        const m = p1 <= 12 ? p1 : p2;
        const d = p1 <= 12 ? p2 : p1;
        targetDate = new Date(p3, m - 1, d);
      }
    }
  }

  // If date couldn't be parsed (e.g. "10" or "7/10" without year)
  if (!targetDate || isNaN(targetDate.getTime())) {
    // Check if status is delayed
    if (normStatus === "delayed") {
      return {
        type: "delayed",
        daysLeft: null,
        label: "Delayed",
        badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
        dotClass: "bg-rose-500",
      };
    }
    return {
      type: "custom",
      daysLeft: null,
      label: raw,
      badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
      dotClass: "bg-amber-500",
    };
  }

  const diffMs = targetDate.getTime() - todayDate.getTime();
  const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (daysLeft < 0) {
    return {
      type: "delayed",
      daysLeft,
      label: `Overdue by ${Math.abs(daysLeft)}d`,
      badgeClass: "bg-rose-50 text-rose-700 border-rose-200 animate-pulse",
      dotClass: "bg-rose-600",
    };
  }

  if (daysLeft <= 7) {
    return {
      type: "urgent",
      daysLeft,
      label: daysLeft === 0 ? "Due Today" : `Due in ${daysLeft}d`,
      badgeClass: "bg-amber-50 text-amber-800 border-amber-300 font-semibold",
      dotClass: "bg-amber-500",
    };
  }

  if (daysLeft <= 14) {
    return {
      type: "upcoming",
      daysLeft,
      label: `Due in ${daysLeft}d`,
      badgeClass: "bg-sky-50 text-sky-700 border-sky-200",
      dotClass: "bg-sky-500",
    };
  }

  return {
    type: "scheduled",
    daysLeft,
    label: `${daysLeft}d left`,
    badgeClass: "bg-surface-muted text-text-muted border-border",
    dotClass: "bg-primary/50",
  };
}

/**
 * Standard project stage progression pipelines.
 * Allows projects to smoothly transition: Concept -> Design -> Site -> Handover
 */
export const STAGE_PIPELINES = {
  standard: ["Concept", "Design", "Site"],
  detailed: [
    "Site Planning",
    "Plinth Level",
    "3D Modelling",
    "Detail Drawing",
    "Site Execution",
    "Finishing",
    "Handover",
  ],
};

/**
 * Given a current stage, determines the next stage in the pipeline.
 */
export function getNextStage(currentStage) {
  if (!currentStage) return "Concept";
  const s = currentStage.trim().toLowerCase();

  // 1. Check Standard Pipeline: Concept -> Design -> Site -> Completed
  if (s === "concept" || s === "conceptual") return "Design";
  if (s === "design") return "Site";
  if (s === "site" || s === "site work") return "Completed";

  // 2. Check Detailed Pipeline
  const detailed = STAGE_PIPELINES.detailed;
  const idx = detailed.findIndex((st) => st.toLowerCase() === s);
  if (idx >= 0 && idx < detailed.length - 1) {
    return detailed[idx + 1];
  }
  if (idx === detailed.length - 1) {
    return "Completed";
  }

  // 3. Fallbacks based on common stage keywords
  if (s.includes("planning")) return "3D Modelling";
  if (s.includes("3d") || s.includes("modelling")) return "Detail Drawing";
  if (s.includes("drawing")) return "Site Execution";
  if (s.includes("execution") || s.includes("construction")) return "Finishing";
  if (s.includes("finish")) return "Handover";

  return null;
}

/**
 * Estimates initial or default progress % based on the stage name
 */
export function getStageDefaultProgress(stage, status) {
  if ((status || "").toLowerCase() === "completed") return 100;
  if (!stage) return 20;
  const s = stage.trim().toLowerCase();
  if (s.includes("concept")) return 25;
  if (s.includes("design") || s.includes("3d") || s.includes("modelling")) return 50;
  if (s.includes("drawing") || s.includes("detail")) return 65;
  if (s.includes("site") || s.includes("construction") || s.includes("plinth")) return 80;
  if (s.includes("finish") || s.includes("interior")) return 90;
  if (s.includes("handover") || s.includes("completed")) return 100;
  return 30;
}

/**
 * Standard project status options
 */
export const STATUS_OPTIONS = ["Active", "On Hold", "Delayed", "Completed"];

/**
 * Formats any stored project date into a proper human-readable Bikram Sambat date.
 * Converts ISO (2025-07-26), BS (2083/4/25), or legacy shorthand (7/26).
 */
export function formatProjectDateNepali(dateStr) {
  if (!dateStr || !String(dateStr).trim()) return "—";
  const raw = String(dateStr).trim();

  // 1. Bikram Sambat YYYY/MM/DD or YYYY-MM-DD
  const bsMatch = raw.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
  if (bsMatch) {
    const y = parseInt(bsMatch[1], 10);
    const m = parseInt(bsMatch[2], 10);
    const d = parseInt(bsMatch[3], 10);
    if (y >= 2070 && y <= 2120 && m >= 1 && m <= 12) {
      const monthName = NEPALI_MONTHS[m - 1] || `Month ${m}`;
      return `${d} ${monthName}, ${y}`;
    }
  }

  // 2. ISO date YYYY-MM-DD (e.g. 2025-07-26)
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const bs = isoToBS(raw);
    if (bs && bs.year) {
      const monthName = NEPALI_MONTHS[bs.month - 1] || `Month ${bs.month}`;
      return `${bs.day} ${monthName}, ${bs.year}`;
    }
  }

  // 3. Shorthand MM/DD or M/D (e.g. 7/26 or 7/6)
  const shortMatch = raw.match(/^(\d{1,2})[/-](\d{1,2})$/);
  if (shortMatch) {
    const m = parseInt(shortMatch[1], 10);
    const d = parseInt(shortMatch[2], 10);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 32) {
      const curBSYear = getTodayBS().year || 2081;
      const monthName = NEPALI_MONTHS[m - 1] || `Month ${m}`;
      return `${d} ${monthName}, ${curBSYear}`;
    }
  }

  return raw;
}

/**
 * Normalizes any date string (ISO, BS YYYY/MM/DD, or M/D shorthand) to an ISO YYYY-MM-DD string.
 * This is safe to feed into NepaliDatePicker and standard Date APIs.
 */
export function normalizeDateToISO(dateStr) {
  if (!dateStr || !String(dateStr).trim()) return "";
  const raw = String(dateStr).trim();

  // 1. If already valid ISO YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }

  // 2. Bikram Sambat YYYY/MM/DD or YYYY-MM-DD
  const bsMatch = raw.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
  if (bsMatch) {
    const y = parseInt(bsMatch[1], 10);
    const m = parseInt(bsMatch[2], 10);
    const d = parseInt(bsMatch[3], 10);
    if (y >= 2070 && y <= 2120 && m >= 1 && m <= 12 && d >= 1 && d <= 32) {
      try {
        const iso = bsDateToISO(y, m, d);
        if (iso) return iso;
      } catch {
        // fallback
      }
    }
  }

  // 3. Shorthand MM/DD or M/D (e.g. 7/26)
  const shortMatch = raw.match(/^(\d{1,2})[/-](\d{1,2})$/);
  if (shortMatch) {
    const m = parseInt(shortMatch[1], 10);
    const d = parseInt(shortMatch[2], 10);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 32) {
      try {
        const curBSYear = getTodayBS().year || 2081;
        const iso = bsDateToISO(curBSYear, m, d);
        if (iso) return iso;
      } catch {
        // fallback
      }
    }
  }

  return raw;
}


/**
 * Formats a timestamp into human-readable relative time ("Just now", "2h ago", "Yesterday", etc.)
 */
export function formatRelativeTime(dateStr) {
  if (!dateStr) return "Recently";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "Recently";
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000);
    if (diffSec < 60) return "Just now";
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    if (diffSec < 172800) return "Yesterday";
    const days = Math.floor(diffSec / 86400);
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return "Recently";
  }
}

/**
 * Returns 2-letter uppercase initials for a given person's name (e.g. "Prabal" -> "PR", "Aditi Shrestha" -> "AS")
 */
export function getInitials(name) {
  if (!name || typeof name !== "string") return "";
  const trimmed = name.trim();
  if (!trimmed) return "";
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Returns distinct soft pastel badge classes based on project type.
 * Ensures project type is visually distinct from stages, statuses, and neutral elements.
 */
export function getProjectTypeBadgeClass(type) {
  if (!type) return "bg-slate-100 text-slate-600 border-slate-200";
  const t = String(type).trim().toLowerCase();
  if (t.includes("site") && t.includes("desk")) {
    return "bg-teal-50 text-teal-700 border-teal-200/80";
  }
  if (t.includes("site")) {
    return "bg-amber-50 text-amber-800 border-amber-200/80";
  }
  if (t.includes("desk")) {
    return "bg-sky-50 text-sky-700 border-sky-200/80";
  }
  if (t.includes("interior")) {
    return "bg-purple-50 text-purple-700 border-purple-200/80";
  }
  if (t.includes("renovation")) {
    return "bg-orange-50 text-orange-800 border-orange-200/80";
  }
  if (t.includes("design")) {
    return "bg-rose-50 text-rose-700 border-rose-200/80";
  }
  if (t.includes("residence") || t.includes("residential")) {
    return "bg-emerald-50 text-emerald-700 border-emerald-200/80";
  }
  if (t.includes("commercial")) {
    return "bg-blue-50 text-blue-700 border-blue-200/80";
  }
  return "bg-stone-100 text-stone-700 border-stone-200";
}

/**
 * Pre-parsed template data from user's Excel sheet
 */
export const EXCEL_TEMPLATE_PROJECTS = [
  {
    lead_architect: "Prabal",
    name: "Tagal Residence",
    project_work: "Residence",
    current_stage: "Site Planning",
    project_type: "Site",
    sub_architects: "",
    start_date: "",
    end_date: "",
    status: "Active",
    color: "#63537E",
  },
  {
    lead_architect: "Prabal",
    name: "Attariya Timmure",
    project_work: "Restaurant",
    current_stage: "Plinth Level",
    project_type: "Site",
    sub_architects: "",
    start_date: "",
    end_date: "10",
    status: "Active",
    color: "#497833",
  },
  {
    lead_architect: "Prabal",
    name: "Mandikatar Residence",
    project_work: "Residence",
    current_stage: "Plinth",
    project_type: "Site",
    sub_architects: "",
    start_date: "",
    end_date: "",
    status: "Active",
    color: "#7A5A17",
  },
  {
    lead_architect: "Aadesh",
    name: "Birtamode BKS",
    project_work: "Restaurant",
    current_stage: "Construction ongoing, detail drawings",
    project_type: "Site + Desk",
    sub_architects: "",
    start_date: "",
    end_date: "",
    status: "Active",
    color: "#2563EB",
  },
  {
    lead_architect: "Aadesh",
    name: "BIRATNAGAR CAFETERIA",
    project_work: "Restaurant",
    current_stage: "3D Modelling",
    project_type: "Design",
    sub_architects: "",
    start_date: "7/6",
    end_date: "7/10",
    status: "Active",
    color: "#0D9488",
  },
  {
    lead_architect: "Aadesh",
    name: "Birtamode Residence",
    project_work: "Residence",
    current_stage: "Conceptual Drawings",
    project_type: "Site + Desk",
    sub_architects: "",
    start_date: "",
    end_date: "",
    status: "Active",
    color: "#7C3AED",
  },
  {
    lead_architect: "Deepa",
    name: "Manaslu Thakali",
    project_work: "Restaurant",
    current_stage: "Detail Drawing + Render",
    project_type: "Desk",
    sub_architects: "Unika",
    start_date: "",
    end_date: "",
    status: "Ongoing",
    color: "#EA580C",
  },
  {
    lead_architect: "Deepa",
    name: "Kritipur Residence",
    project_work: "Residence",
    current_stage: "Conceptual",
    project_type: "Desk",
    sub_architects: "",
    start_date: "",
    end_date: "",
    status: "Ongoing",
    color: "#63537E",
  },
  {
    lead_architect: "Nischal",
    name: "Teaching Rooftop",
    project_work: "Restaurant",
    current_stage: "Additional Work",
    project_type: "Site Work",
    sub_architects: "Metal Facade Works",
    start_date: "",
    end_date: "",
    status: "Active",
    color: "#497833",
  },
  {
    lead_architect: "Nischal",
    name: "Melung Thakali, Thamel",
    project_work: "Restaurant",
    current_stage: "Construction Work",
    project_type: "Site Work",
    sub_architects: "Furniture, Color and Tile",
    start_date: "",
    end_date: "",
    status: "Active",
    color: "#913030",
  },
  {
    lead_architect: "Nischal",
    name: "BKS Labim",
    project_work: "Commercial",
    current_stage: "Final Payment",
    project_type: "Handover",
    sub_architects: "Payment Remaining",
    start_date: "",
    end_date: "",
    status: "Ongoing",
    color: "#2563EB",
  },
  {
    lead_architect: "Nischal",
    name: "Inshape Baluwatar",
    project_work: "Handover Complete",
    current_stage: "Final Payment & Final Bill Submission",
    project_type: "Desk",
    sub_architects: "",
    start_date: "",
    end_date: "",
    status: "Completed",
    color: "#0D9488",
  },
  {
    lead_architect: "Nischal",
    name: "Yatra Lounge",
    project_work: "Lounge",
    current_stage: "Maintenance Work",
    project_type: "Site Work",
    sub_architects: "Complete",
    start_date: "",
    end_date: "",
    status: "Completed",
    color: "#7C3AED",
  },
  {
    lead_architect: "Nischal",
    name: "Timmure Durbar Marg",
    project_work: "Restaurant",
    current_stage: "Renovation",
    project_type: "Site Work",
    sub_architects: "Complete",
    start_date: "",
    end_date: "",
    status: "Completed",
    color: "#EA580C",
  },
  {
    lead_architect: "Nischal",
    name: "Jawalakhel Staff College",
    project_work: "Restaurant",
    current_stage: "Furniture Work",
    project_type: "Site Work",
    sub_architects: "19 Gatey Handover",
    start_date: "",
    end_date: "",
    status: "Ongoing",
    color: "#63537E",
  },
  {
    lead_architect: "Bipna",
    name: "Manaslu Thakali (Interior)",
    project_work: "Restaurant",
    current_stage: "BOQ",
    project_type: "Design",
    sub_architects: "",
    start_date: "",
    end_date: "",
    status: "Ongoing",
    color: "#497833",
  },
  {
    lead_architect: "Som",
    name: "Janakpur BKS",
    project_work: "Restaurant",
    current_stage: "Finishing Touch-up Works",
    project_type: "Site Work",
    sub_architects: "",
    start_date: "",
    end_date: "",
    status: "Ongoing",
    color: "#7A5A17",
  },
  {
    lead_architect: "Som",
    name: "Daddys' Kitchen - Teaching",
    project_work: "Restaurant",
    current_stage: "Site Work",
    project_type: "Site Work",
    sub_architects: "",
    start_date: "2083/4/25",
    end_date: "2083/5/14",
    status: "60%",
    color: "#2563EB",
  },
  {
    lead_architect: "Som",
    name: "Timmure Durbarmarg (Site)",
    project_work: "Restaurant",
    current_stage: "Site Work",
    project_type: "Site Work",
    sub_architects: "",
    start_date: "2083/4/25",
    end_date: "2083/5/14",
    status: "70%",
    color: "#0D9488",
  },
  {
    lead_architect: "Unika",
    name: "Biratnagar Cafe",
    project_work: "Restaurant",
    current_stage: "Detail Drawing",
    project_type: "Interior",
    sub_architects: "",
    start_date: "",
    end_date: "",
    status: "Ongoing",
    color: "#7C3AED",
  },
  {
    lead_architect: "Unika",
    name: "T3 Thakali",
    project_work: "Banquet + Restaurant",
    current_stage: "Concept Design",
    project_type: "Design",
    sub_architects: "",
    start_date: "",
    end_date: "",
    status: "Active",
    color: "#EA580C",
  },
];

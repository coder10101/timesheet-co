import React, { useState, useEffect, useMemo } from "react";
import {
  TRACK_STAGES,
  ASSIGNED_ROLES,
  STATUS_OPTIONS,
  calculateOverallProgress,
  formatProjectDateNepali,
  normalizeDateToISO,
} from "../../../constants/projectPresets";
import { NepaliDatePicker } from "../../../components/NepaliDatePicker";
import { StageSelectDropdown } from "./StageSelectDropdown";
import {
  X,
  Check,
  Plus,
  Trash2,
  Calendar,
  Layers,
  Users,
  Briefcase,
  AlertCircle,
  Sliders,
  CheckCircle2,
  Sparkles,
} from "lucide-react";

export const PRESET_COLORS = [
  "#63537E", // Indigo-plum
  "#497833", // Olive forest
  "#7A5A17", // Amber ochre
  "#913030", // Crimson rust
  "#3E8F18", // Emerald leaf
  "#514366", // Slate violet
  "#2563eb", // Blue
  "#0891b2", // Cyan
  "#d97706", // Amber
];

export function ProjectFormModal({
  isOpen,
  onClose,
  project,
  onSave,
  saving,
  employees = [],
  projectConfig = {},
  workLogContributors = [],
}) {
  const isEditing = Boolean(project);

  const [name, setName] = useState("");
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [status, setStatus] = useState("Active");

  // Track toggles
  const [hasDesign, setHasDesign] = useState(true);
  const [hasSite, setHasSite] = useState(true);

  // Stage and progress
  const [designStage, setDesignStage] = useState("");
  const [designProgress, setDesignProgress] = useState(25);
  const [siteStage, setSiteStage] = useState("");
  const [siteProgress, setSiteProgress] = useState(0);

  // Team
  const [leadArchitectId, setLeadArchitectId] = useState("");
  const [leadArchitectRole, setLeadArchitectRole] = useState("Design");
  const [selectedSubIds, setSelectedSubIds] = useState([]);
  const [subArchitectRoles, setSubArchitectRoles] = useState({});
  const [externalCollaborators, setExternalCollaborators] = useState("");

  // Categorization & Dates
  const [projectWork, setProjectWork] = useState("");
  const [projectType, setProjectType] = useState("");
  const [startDate, setStartDate] = useState("");
  const [deadline, setDeadline] = useState("");

  const [error, setError] = useState("");

  // Populate when modal opens
  useEffect(() => {
    if (project) {
      setName(project.name || "");
      setColor(project.color || PRESET_COLORS[0]);
      setStatus(project.status || "Active");

      const hasD = project.has_design !== false && project.hasDesign !== false;
      const hasS = project.has_site !== false && project.hasSite !== false;
      setHasDesign(hasD);
      setHasSite(hasS);

      setDesignStage(project.design_stage || "");
      setDesignProgress(Number(project.design_progress) || 0);

      setSiteStage(project.site_stage || "");
      setSiteProgress(Number(project.site_progress) || 0);

      setLeadArchitectId(project.lead_architect_id || "");
      setLeadArchitectRole(project.lead_architect_role || "Design");

      setSelectedSubIds(Array.isArray(project.sub_architect_ids) ? project.sub_architect_ids : []);
      setSubArchitectRoles(
        typeof project.sub_architect_roles === "object" && project.sub_architect_roles !== null
          ? project.sub_architect_roles
          : {}
      );
      setExternalCollaborators(
        project.external_collaborators || project.sub_architects || ""
      );

      setProjectWork(project.project_work || "");
      setProjectType(project.project_type || "");

      const rawEnd = project.end_date || project.deadline || "";
      setDeadline(normalizeDateToISO(rawEnd) || rawEnd);

      const rawStart = project.start_date || "";
      setStartDate(normalizeDateToISO(rawStart) || rawStart);

      setError("");
    } else {
      setName("");
      setColor(PRESET_COLORS[0]);
      setStatus("Active");
      setHasDesign(true);
      setHasSite(true);
      setDesignStage(TRACK_STAGES.design[0] || "");
      setDesignProgress(25);
      setSiteStage("");
      setSiteProgress(0);
      setLeadArchitectId("");
      setLeadArchitectRole("Design");
      setSelectedSubIds([]);
      setSubArchitectRoles({});
      setExternalCollaborators("");
      setProjectWork("");
      setProjectType("Interior");
      setStartDate("");
      setDeadline("");
      setError("");
    }
  }, [project, isOpen]);

  // Exclude admin members from being assigned as lead/sub
  const assignableEmployees = useMemo(() => {
    return (employees || []).filter(
      (emp) =>
        (emp.role || "").toLowerCase() !== "admin" &&
        !emp.is_admin &&
        (emp.role || "").toLowerCase() !== "administrator"
    );
  }, [employees]);

  // Composite progress
  const compositeProgress = useMemo(() => {
    return calculateOverallProgress({
      designProgress,
      siteProgress,
      hasDesign,
      hasSite,
    });
  }, [designProgress, siteProgress, hasDesign, hasSite]);

  if (!isOpen) return null;

  const handleToggleSubEmp = (empId) => {
    setSelectedSubIds((prev) => {
      if (prev.includes(empId)) {
        const next = prev.filter((id) => id !== empId);
        const roles = { ...subArchitectRoles };
        delete roles[empId];
        setSubArchitectRoles(roles);
        return next;
      }
      return [...prev, empId];
    });
  };

  const handleSetSubRole = (empId, role) => {
    setSubArchitectRoles((prev) => ({
      ...prev,
      [empId]: role,
    }));
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!name.trim()) {
      setError("Project name is required.");
      return;
    }

    if (!hasDesign && !hasSite) {
      setError("Please enable at least one track (Design or Site).");
      return;
    }

    setError("");

    // Build composite stage string
    let compositeStage = "";
    if (hasDesign && hasSite && designStage && siteStage) {
      compositeStage = `🎨 ${designStage} + 🏗️ ${siteStage}`;
    } else if (hasDesign && designStage) {
      compositeStage = `🎨 ${designStage}`;
    } else if (hasSite && siteStage) {
      compositeStage = `🏗️ ${siteStage}`;
    }

    // Build sub_architect_names map
    const subNamesMap = {};
    selectedSubIds.forEach((sId) => {
      const u = employees.find((e) => e.id === sId);
      if (u?.name) subNamesMap[sId] = u.name;
    });

    const leadObj = employees.find((e) => e.id === leadArchitectId);
    const leadName = leadObj?.name || "";

    const payload = {
      name: name.trim(),
      color,
      status: compositeProgress >= 100 ? "Completed" : status,
      current_stage: compositeStage,
      progress: compositeProgress,
      has_design: hasDesign,
      has_site: hasSite,
      hasDesign,
      hasSite,
      design_stage: hasDesign ? designStage : "",
      design_progress: hasDesign ? designProgress : 0,
      site_stage: hasSite ? siteStage : "",
      site_progress: hasSite ? siteProgress : 0,
      lead_architect_id: leadArchitectId || null,
      lead_architect: leadName,
      lead_architect_role: leadArchitectRole,
      sub_architect_ids: selectedSubIds,
      sub_architect_roles: subArchitectRoles,
      sub_architect_names: subNamesMap,
      sub_architects: externalCollaborators,
      external_collaborators: externalCollaborators,
      project_work: projectWork,
      project_type: projectType,
      start_date: startDate || "",
      end_date: deadline || "",
      deadline: deadline || "",
    };

    try {
      await onSave(payload);
      onClose();
    } catch (err) {
      setError(err.message || "Failed to save project.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-border w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-scale-up">
        {/* Fixed Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-subtle/50 shrink-0">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-xs"
              style={{ backgroundColor: color }}
            >
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-text-primary">
                {isEditing ? `Edit "${project.name}"` : "Create New Project"}
              </h2>
              <p className="text-xs text-text-muted">
                Architectural project configuration & dual-track stages
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-text-muted hover:text-text-primary hover:bg-surface-muted transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form id="project-form-modal" onSubmit={handleSubmit} className="p-6 space-y-5 flex-1 overflow-y-auto">
          {error && (
            <div className="flex items-center gap-2.5 p-3.5 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Section 1: Basic Info */}
          <div className="bg-surface-subtle/50 rounded-2xl p-4 border border-border space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" /> 1. Project Identification
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-text-secondary mb-1">
                  Project Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kathmandu Luxury Villa"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full text-sm font-medium px-3.5 py-2.5 bg-white border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">
                  Color Theme
                </label>
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`w-6 h-6 rounded-full transition-transform cursor-pointer ${
                        color === c ? "scale-125 ring-2 ring-offset-2 ring-primary" : "hover:scale-110"
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">
                  Work Category
                </label>
                <input
                  type="text"
                  list="work-categories-list"
                  placeholder="e.g. Residence, Hospitality..."
                  value={projectWork}
                  onChange={(e) => setProjectWork(e.target.value)}
                  className="w-full text-sm font-medium px-3.5 py-2 bg-white border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
                <datalist id="work-categories-list">
                  <option value="Residence" />
                  <option value="Restaurant / Cafe" />
                  <option value="Hospitality / Resort" />
                  <option value="Commercial" />
                  <option value="Interior" />
                  <option value="Renovation" />
                </datalist>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">
                  Project Type
                </label>
                <input
                  type="text"
                  list="project-types-list"
                  placeholder="e.g. Interior, Site, Turnkey..."
                  value={projectType}
                  onChange={(e) => setProjectType(e.target.value)}
                  className="w-full text-sm font-medium px-3.5 py-2 bg-white border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
                <datalist id="project-types-list">
                  <option value="Design Only" />
                  <option value="Site Execution" />
                  <option value="Interior" />
                  <option value="Renovation" />
                  <option value="Turnkey" />
                </datalist>
              </div>
            </div>
          </div>

          {/* Section 2: Team Roster & Scopes */}
          <div className="bg-surface-subtle/50 rounded-2xl p-4 border border-border space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" /> 2. Team Architecture & Responsibilities
            </h3>

            {/* Lead Architect & Scope */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">
                  Lead Architect
                </label>
                <select
                  value={leadArchitectId}
                  onChange={(e) => setLeadArchitectId(e.target.value)}
                  className="w-full text-sm font-medium px-3.5 py-2.5 bg-white border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary cursor-pointer"
                >
                  <option value="">-- Unassigned --</option>
                  {assignableEmployees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.role || "Architect"})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                  Lead Assigned Scope
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {ASSIGNED_ROLES.map((r) => {
                    const isSelected = leadArchitectRole === r.id;
                    const roleClasses =
                      r.id === "Design"
                        ? isSelected
                          ? "bg-[#63537E] text-white border-[#63537E] shadow-xs"
                          : "bg-[#63537E]/5 text-[#514366] border-[#63537E]/25 hover:bg-[#63537E]/10"
                        : r.id === "Site"
                        ? isSelected
                          ? "bg-teal-700 text-white border-teal-700 shadow-xs"
                          : "bg-teal-50 text-teal-900 border-teal-200/80 hover:bg-teal-100/60"
                        : r.id === "BOQ"
                        ? isSelected
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                          : "bg-emerald-50 text-emerald-900 border-emerald-200/80 hover:bg-emerald-100/60"
                        : isSelected
                        ? "bg-purple-600 text-white border-purple-600 shadow-xs"
                        : "bg-purple-50 text-purple-900 border-purple-200/80 hover:bg-purple-100/60";

                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setLeadArchitectRole(r.id)}
                        className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${roleClasses}`}
                      >
                        <span className="text-sm">{r.icon}</span>
                        <span>{r.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Sub-Architects Multi-select */}
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                Sub-Architects / Team Members
              </label>
              <div className="flex flex-wrap gap-1.5 p-2 bg-white rounded-xl border border-border max-h-36 overflow-y-auto">
                {assignableEmployees.map((emp) => {
                  const isSelected = selectedSubIds.includes(emp.id);
                  return (
                    <button
                      key={emp.id}
                      type="button"
                      onClick={() => handleToggleSubEmp(emp.id)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                        isSelected
                          ? "bg-primary text-white font-semibold shadow-xs"
                          : "bg-surface-subtle text-text-secondary border border-border hover:bg-surface-muted"
                      }`}
                    >
                      {isSelected ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5 text-text-muted" />}
                      <span>{emp.name}</span>
                    </button>
                  );
                })}
              </div>

              {/* Sub-Architect Scope Selector */}
              {selectedSubIds.length > 0 && (
                <div className="mt-2.5 p-3 rounded-xl bg-white border border-border divide-y divide-border-light space-y-2">
                  <div className="text-[11px] font-bold uppercase text-text-muted">
                    Assigned Scope per Sub-Architect
                  </div>
                  {selectedSubIds.map((sId) => {
                    const emp = employees.find((e) => e.id === sId);
                    const currentRole = subArchitectRoles[sId] || "Design";
                    return (
                      <div key={sId} className="pt-2 flex items-center justify-between gap-2">
                        <span className="text-xs font-medium text-text-primary truncate">
                          {emp?.name || sId}
                        </span>
                        <div className="flex items-center gap-1">
                          {ASSIGNED_ROLES.map((r) => {
                            const isSelected = currentRole === r.id;
                            const subRoleClasses =
                              r.id === "Design"
                                ? isSelected
                                  ? "bg-[#63537E] text-white border-[#63537E] shadow-xs"
                                  : "bg-[#63537E]/5 text-[#514366] border-[#63537E]/25 hover:bg-[#63537E]/10"
                                : r.id === "Site"
                                ? isSelected
                                  ? "bg-teal-700 text-white border-teal-700 shadow-xs"
                                  : "bg-teal-50 text-teal-900 border-teal-200/80 hover:bg-teal-100/60"
                                : r.id === "BOQ"
                                ? isSelected
                                  ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                                  : "bg-emerald-50 text-emerald-900 border-emerald-200/80 hover:bg-emerald-100/60"
                                : isSelected
                                ? "bg-purple-600 text-white border-purple-600 shadow-xs"
                                : "bg-purple-50 text-purple-900 border-purple-200/80 hover:bg-purple-100/60";

                            return (
                              <button
                                key={r.id}
                                type="button"
                                onClick={() => handleSetSubRole(sId, r.id)}
                                className={`px-2 py-0.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${subRoleClasses}`}
                              >
                                <span>{r.icon} {r.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* External Collaborators */}
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">
                External Contractors / Consultants (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Steel Fabricators, MEP Consultant, Tile Contractor"
                value={externalCollaborators}
                onChange={(e) => setExternalCollaborators(e.target.value)}
                className="w-full text-xs font-medium px-3.5 py-2 bg-white border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
          </div>

          {/* Section 3: Dual-Track Stages & Interactive Toggles */}
          <div className="bg-surface-subtle/50 rounded-2xl p-4 border border-border space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-2">
                <Sliders className="w-4 h-4 text-primary" /> 3. Dual-Track Execution & Progress
              </h3>
              <span className="text-[11px] text-text-muted">
                Toggle tracks ON / OFF
              </span>
            </div>

            {/* Interactive Track Toggles */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  if (hasDesign && !hasSite) return;
                  setHasDesign(!hasDesign);
                }}
                className={`flex items-center justify-between p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                  hasDesign
                    ? "bg-[#63537E]/10 border-[#63537E]/30 text-[#514366] shadow-xs"
                    : "bg-white border-border text-text-muted hover:bg-surface-muted"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">🎨</span>
                  <div>
                    <div className="text-xs font-bold">Design Track</div>
                    <div className="text-[11px] opacity-75">Concept & Drawings</div>
                  </div>
                </div>
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all ${
                    hasDesign ? "bg-[#63537E] border-[#63537E] text-white" : "border-border bg-white"
                  }`}
                >
                  {hasDesign && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (hasSite && !hasDesign) return;
                  setHasSite(!hasSite);
                }}
                className={`flex items-center justify-between p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                  hasSite
                    ? "bg-teal-50/80 border-teal-300 text-teal-950 shadow-xs"
                    : "bg-white border-border text-text-muted hover:bg-surface-muted"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">🏗️</span>
                  <div>
                    <div className="text-xs font-bold">Site Track</div>
                    <div className="text-[11px] opacity-75">Site Construction</div>
                  </div>
                </div>
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all ${
                    hasSite ? "bg-teal-700 border-teal-700 text-white" : "border-border bg-white"
                  }`}
                >
                  {hasSite && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
              </button>
            </div>

            {/* Design Controls */}
            {hasDesign && (
              <div className="p-4 rounded-xl border border-[#63537E]/20 bg-[#63537E]/5 space-y-3 animate-fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#514366] flex items-center gap-1.5">
                    <span>🎨</span> Design Track
                  </span>
                  <span className="text-xs font-bold text-[#63537E] font-mono">{designProgress}%</span>
                </div>

                <StageSelectDropdown
                  track="design"
                  value={designStage}
                  onChange={setDesignStage}
                  stages={TRACK_STAGES.design}
                  placeholder="Select milestone..."
                />

                <div className="space-y-1 pt-1">
                  <div className="flex items-center justify-between text-[11px] font-medium text-text-muted">
                    <span>Progress</span>
                    <span className="font-mono font-bold text-[#63537E]">{designProgress}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={designProgress}
                    onChange={(e) => setDesignProgress(Number(e.target.value))}
                    className="w-full h-2 bg-[#63537E]/20 rounded-lg appearance-none cursor-pointer accent-[#63537E]"
                  />
                </div>
              </div>
            )}

            {/* Site Controls */}
            {hasSite && (
              <div className="p-4 rounded-xl border border-teal-200/80 bg-teal-50/40 space-y-3 animate-fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-teal-950 flex items-center gap-1.5">
                    <span>🏗️</span> Site Track
                  </span>
                  <span className="text-xs font-bold text-teal-800 font-mono">{siteProgress}%</span>
                </div>

                <StageSelectDropdown
                  track="site"
                  value={siteStage}
                  onChange={setSiteStage}
                  stages={TRACK_STAGES.site}
                  placeholder="Select milestone..."
                />

                <div className="space-y-1 pt-1">
                  <div className="flex items-center justify-between text-[11px] font-medium text-text-muted">
                    <span>Progress</span>
                    <span className="font-mono font-bold text-teal-800">{siteProgress}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={siteProgress}
                    onChange={(e) => setSiteProgress(Number(e.target.value))}
                    className="w-full h-2 bg-teal-200/70 rounded-lg appearance-none cursor-pointer accent-teal-700"
                  />
                </div>
              </div>
            )}

            {/* Overall Progress Computed Card */}
            <div className="p-4 rounded-xl bg-white border border-border space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-text-secondary flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-primary" /> Overall Project Progress
                </span>
                <span className="font-extrabold text-sm text-primary">{compositeProgress}%</span>
              </div>
              <div className="w-full bg-border-light h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-primary h-full transition-all duration-300 rounded-full"
                  style={{ width: `${compositeProgress}%` }}
                />
              </div>
            </div>
          </div>

          {/* Section 4: Schedule & Deadlines */}
          <div className="bg-surface-subtle/50 rounded-2xl p-4 border border-border space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" /> 4. Schedule & Status
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">
                  Start Date (Nepali BS / AD)
                </label>
                <NepaliDatePicker
                  value={startDate}
                  onChange={setStartDate}
                  placeholder="Select start date"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">
                  Target Deadline (Nepali BS / AD)
                </label>
                <NepaliDatePicker
                  value={deadline}
                  onChange={setDeadline}
                  placeholder="Select target deadline"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                Status
              </label>
              <div className="grid grid-cols-4 gap-2">
                {STATUS_OPTIONS.map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatus(st)}
                    className={`px-3 py-2 text-xs font-semibold rounded-xl border transition-all text-center cursor-pointer ${
                      status === st
                        ? "bg-primary text-white border-primary shadow-xs"
                        : "bg-white text-text-secondary border-border hover:bg-surface-muted"
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </form>

        {/* Fixed Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-3.5 border-t border-border bg-surface-subtle/40 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-medium rounded-xl text-text-secondary hover:bg-surface-muted transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="project-form-modal"
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold rounded-xl bg-primary text-white hover:bg-primary/90 disabled:opacity-50 shadow-xs transition-all cursor-pointer"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>{isEditing ? "Save Changes" : "Create Project"}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

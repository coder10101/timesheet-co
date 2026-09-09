import { useState, useEffect } from "react";
import { Pencil, X, Check, Plus } from "lucide-react";
import {
  TRACK_STAGES,
  ASSIGNED_ROLES,
  calculateOverallProgress,
  formatProjectDateNepali,
  normalizeDateToISO,
} from "../../../../constants/projectPresets";
import { NepaliDatePicker } from "../../../../components/NepaliDatePicker";
import { StageSelectDropdown } from "../StageSelectDropdown";

export function ProjectEditDetailsModal({
  isOpen,
  onClose,
  project,
  isAdmin = false,
  me,
  config = {},
  assignableEmployees = [],
  employees = [],
  onSave,
  saving = false,
}) {
  const [editStage, setEditStage] = useState("");
  const [editStatus, setEditStatus] = useState("Active");
  const [editProgress, setEditProgress] = useState(0);
  const [editDesignStage, setEditDesignStage] = useState("");
  const [editDesignProgress, setEditDesignProgress] = useState(0);
  const [editSiteStage, setEditSiteStage] = useState("");
  const [editSiteProgress, setEditSiteProgress] = useState(0);
  const [editHasDesign, setEditHasDesign] = useState(true);
  const [editHasSite, setEditHasSite] = useState(true);
  const [editStartDate, setEditStartDate] = useState("");
  const [editDeadline, setEditDeadline] = useState("");
  const [editLeadId, setEditLeadId] = useState("");
  const [editLeadRole, setEditLeadRole] = useState("Design");
  const [editSelectedSubIds, setEditSelectedSubIds] = useState([]);
  const [editSubRoles, setEditSubRoles] = useState({});
  const [editCustomSubText, setEditCustomSubText] = useState("");

  useEffect(() => {
    if (!isOpen || !project) return;

    setEditStage(project.current_stage || "");
    setEditDesignStage(project.design_stage || "");
    const dp =
      project.design_progress !== undefined && project.design_progress !== null
        ? Number(project.design_progress)
        : project.lead_architect_role === "Site"
          ? 0
          : Number(project.progress) || 0;
    const sp =
      project.site_progress !== undefined && project.site_progress !== null
        ? Number(project.site_progress)
        : project.lead_architect_role === "Site"
          ? Number(project.progress) || 0
          : 0;

    setEditDesignProgress(dp);
    setEditSiteStage(project.site_stage || "");
    setEditSiteProgress(sp);

    const hasD = project.has_design !== false && project.hasDesign !== false;
    const hasS = project.has_site !== false && project.hasSite !== false;
    setEditHasDesign(hasD);
    setEditHasSite(hasS);

    const initialOverall = calculateOverallProgress({
      designProgress: dp,
      siteProgress: sp,
      hasDesign: hasD,
      hasSite: hasS,
    });

    setEditStatus(project.status || "Active");
    setEditProgress(initialOverall);
    setEditStartDate(
      project.start_date ? normalizeDateToISO(project.start_date) : "",
    );
    setEditDeadline(
      project.end_date || project.deadline
        ? normalizeDateToISO(project.end_date || project.deadline)
        : "",
    );
    setEditLeadId(project.lead_architect_id || "");
    setEditLeadRole(project.lead_architect_role || "Design");
    setEditSubRoles(
      typeof project.sub_architect_roles === "object" &&
        project.sub_architect_roles !== null
        ? { ...project.sub_architect_roles }
        : {},
    );

    const subIds = Array.isArray(project.sub_architect_ids)
      ? [...project.sub_architect_ids]
      : [];
    const unmappedSubs = [];
    if (project.sub_architects) {
      const parts = String(project.sub_architects)
        .split(/[,;/+]/)
        .map((s) => s.trim())
        .filter(Boolean);
      parts.forEach((subName) => {
        const matchedEmp = employees?.find(
          (e) => e.name?.toLowerCase() === subName.toLowerCase(),
        );
        if (matchedEmp) {
          if (!subIds.includes(matchedEmp.id)) {
            subIds.push(matchedEmp.id);
          }
        } else {
          unmappedSubs.push(subName);
        }
      });
    }
    setEditSelectedSubIds(subIds);
    setEditCustomSubText(unmappedSubs.join(", "));
  }, [isOpen, project, employees]);

  if (!isOpen || !project) return null;

  const toggleEditSubEmp = (empId) => {
    setEditSelectedSubIds((prev) =>
      prev.includes(empId)
        ? prev.filter((id) => id !== empId)
        : [...prev, empId],
    );
  };

  const handleSubmit = async () => {
    const activities = [];
    const nowISO = new Date().toISOString();
    const actorInfo = {
      user_id: me?.id || null,
      user_name: me?.name || "Team Member",
      user_role: me?.role || "Editor",
      created_at: nowISO,
    };

    if (editStage && editStage !== project.current_stage) {
      activities.push({
        id: `act_${Date.now()}_stage`,
        type: "stage_change",
        title: `Stage changed to ${editStage}`,
        description: project.current_stage
          ? `Stage shifted from "${project.current_stage}" to "${editStage}"`
          : `Stage initialized as "${editStage}"`,
        old_value: project.current_stage || "",
        new_value: editStage,
        ...actorInfo,
      });
    }

    const currentDeadlineISO =
      project.end_date || project.deadline
        ? normalizeDateToISO(project.end_date || project.deadline)
        : "";
    const newDeadlineISO = editDeadline ? normalizeDateToISO(editDeadline) : "";
    if (newDeadlineISO !== currentDeadlineISO) {
      activities.push({
        id: `act_${Date.now()}_deadline`,
        type: "deadline_change",
        title: editDeadline
          ? `Target deadline set to ${formatProjectDateNepali(editDeadline)}`
          : "Target deadline removed",
        description: currentDeadlineISO
          ? `Target deadline updated from ${formatProjectDateNepali(currentDeadlineISO)} to ${formatProjectDateNepali(editDeadline)}`
          : `Target deadline scheduled for ${formatProjectDateNepali(editDeadline)}`,
        old_value: currentDeadlineISO,
        new_value: editDeadline,
        ...actorInfo,
      });
    }

    if (editStatus && editStatus !== project.status) {
      activities.push({
        id: `act_${Date.now()}_status`,
        type: "status_change",
        title: `Status marked as ${editStatus}`,
        description: `Project status changed from "${project.status || "Active"}" to "${editStatus}"`,
        old_value: project.status || "",
        new_value: editStatus,
        ...actorInfo,
      });
    }

    const currentStartISO = project.start_date
      ? normalizeDateToISO(project.start_date)
      : "";
    const newStartISO = editStartDate ? normalizeDateToISO(editStartDate) : "";
    if (newStartISO !== currentStartISO) {
      activities.push({
        id: `act_${Date.now()}_start`,
        type: "start_date_change",
        title: editStartDate
          ? `Start date set to ${formatProjectDateNepali(editStartDate)}`
          : "Start date cleared",
        description: currentStartISO
          ? `Start date updated from ${formatProjectDateNepali(currentStartISO)} to ${formatProjectDateNepali(editStartDate)}`
          : `Project start date set to ${formatProjectDateNepali(editStartDate)}`,
        old_value: currentStartISO,
        new_value: editStartDate,
        ...actorInfo,
      });
    }

    if (
      Number(editProgress) !== Number(project.progress || 0) &&
      (!editStage || editStage === project.current_stage)
    ) {
      activities.push({
        id: `act_${Date.now()}_progress`,
        type: "progress_change",
        title: `Progress updated to ${editProgress}%`,
        description: `Completion progress adjusted from ${project.progress || 0}% to ${editProgress}%`,
        old_value: project.progress || 0,
        new_value: Number(editProgress),
        ...actorInfo,
      });
    }

    const leadEmp = assignableEmployees.find((e) => e.id === editLeadId);

    const computedOverall = calculateOverallProgress({
      designProgress: editHasDesign ? Number(editDesignProgress) || 0 : 0,
      siteProgress: editHasSite ? Number(editSiteProgress) || 0 : 0,
      hasDesign: editHasDesign,
      hasSite: editHasSite,
    });

    let synthesizedStage = "";
    if (editHasDesign && editHasSite && editDesignStage && editSiteStage) {
      synthesizedStage = `🎨 ${editDesignStage} + 🏗️ ${editSiteStage}`;
    } else if (editHasDesign && editDesignStage) {
      synthesizedStage = `🎨 ${editDesignStage}`;
    } else if (editHasSite && editSiteStage) {
      synthesizedStage = `🏗️ ${editSiteStage}`;
    } else {
      synthesizedStage = editStage;
    }

    const subNamesMap = {};
    (isAdmin ? editSelectedSubIds : project.sub_architect_ids || []).forEach(
      (id) => {
        const emp = employees?.find((e) => e.id === id);
        if (emp?.name) subNamesMap[id] = emp.name;
        else if (project.sub_architect_names?.[id])
          subNamesMap[id] = project.sub_architect_names[id];
      },
    );

    await onSave({
      current_stage: synthesizedStage,
      design_stage: editHasDesign ? editDesignStage : "",
      design_progress: editHasDesign ? Number(editDesignProgress) || 0 : 0,
      site_stage: editHasSite ? editSiteStage : "",
      site_progress: editHasSite ? Number(editSiteProgress) || 0 : 0,
      has_design: editHasDesign,
      has_site: editHasSite,
      hasDesign: editHasDesign,
      hasSite: editHasSite,
      end_date: editDeadline,
      deadline: editDeadline,
      start_date: editStartDate,
      progress: computedOverall,
      status: isAdmin ? editStatus : project.status,
      lead_architect_id: isAdmin
        ? editLeadId || null
        : project.lead_architect_id,
      lead_architect: isAdmin
        ? leadEmp
          ? leadEmp.name
          : editLeadId
            ? project.lead_architect
            : ""
        : project.lead_architect,
      lead_architect_role: isAdmin
        ? editLeadRole
        : project.lead_architect_role,
      sub_architect_ids: isAdmin
        ? editSelectedSubIds
        : project.sub_architect_ids,
      sub_architect_roles: isAdmin ? editSubRoles : project.sub_architect_roles,
      sub_architect_names: subNamesMap,
      sub_architects: isAdmin
        ? editCustomSubText.trim()
        : project.sub_architects,
      activityRecords: activities,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-xl border border-border max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Fixed Header */}
        <div className="flex items-center justify-between border-b border-border-light px-6 py-4 bg-surface-subtle/50 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Pencil size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-text">
                {isAdmin ? "Edit Project Details" : "Update Stage & Deadline"}
              </h3>
              <p className="text-[11px] text-text-muted">{project.name}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-text-muted hover:text-text hover:bg-surface-muted cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 space-y-4 flex-1 overflow-y-auto">
          {/* DUAL-TRACK STAGES & PROGRESS */}
          <div className="p-3.5 rounded-2xl bg-surface-muted/60 border border-border-light space-y-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted block">
              Dual-Track Execution Streams (Design vs Site)
            </span>

            {/* 1. Design Track */}
            <div
              className={`p-3 bg-white rounded-xl border transition-all ${
                editHasDesign
                  ? "border-border shadow-2xs"
                  : "border-border/60 bg-slate-50/70 opacity-70"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={editHasDesign}
                    onClick={() => {
                      if (editHasDesign && !editHasSite) return;
                      const next = !editHasDesign;
                      setEditHasDesign(next);
                      setEditProgress(
                        calculateOverallProgress({
                          designProgress: next ? editDesignProgress : 0,
                          siteProgress: editHasSite ? editSiteProgress : 0,
                          hasDesign: next,
                          hasSite: editHasSite,
                        }),
                      );
                    }}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      editHasDesign ? "bg-primary" : "bg-slate-300"
                    }`}
                    title={
                      editHasDesign && !editHasSite
                        ? "At least one track must remain enabled"
                        : "Toggle Design Track"
                    }
                  >
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                        editHasDesign ? "translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </button>
                  <span className="text-xs font-bold text-[#514366] flex items-center gap-1">
                    <span>🎨</span> Design Track Stage
                  </span>
                </div>
                {editHasDesign ? (
                  <span className="text-xs font-mono font-bold text-[#63537E]">
                    {editDesignProgress}%
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold text-slate-400 uppercase">
                    Disabled
                  </span>
                )}
              </div>

              {editHasDesign && (
                <div className="space-y-2.5 pt-2">
                  <StageSelectDropdown
                    track="design"
                    value={editDesignStage}
                    onChange={setEditDesignStage}
                    stages={TRACK_STAGES.design}
                    placeholder="Select milestone..."
                  />

                  <div className="space-y-1 pt-1">
                    <div className="flex items-center justify-between text-[11px] font-medium text-text-muted">
                      <span>Design Progress</span>
                      <span className="font-mono font-bold text-[#63537E]">
                        {editDesignProgress}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={editDesignProgress}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setEditDesignProgress(val);
                        setEditProgress(
                          calculateOverallProgress({
                            designProgress: val,
                            siteProgress: editHasSite ? editSiteProgress : 0,
                            hasDesign: true,
                            hasSite: editHasSite,
                          }),
                        );
                      }}
                      className="w-full h-2 bg-[#63537E]/20 rounded-lg appearance-none cursor-pointer accent-[#63537E]"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 2. Site Track */}
            <div
              className={`p-3 bg-white rounded-xl border transition-all ${
                editHasSite
                  ? "border-border shadow-2xs"
                  : "border-border/60 bg-slate-50/70 opacity-70"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={editHasSite}
                    onClick={() => {
                      if (editHasSite && !editHasDesign) return;
                      const next = !editHasSite;
                      setEditHasSite(next);
                      setEditProgress(
                        calculateOverallProgress({
                          designProgress: editHasDesign ? editDesignProgress : 0,
                          siteProgress: next ? editSiteProgress : 0,
                          hasDesign: editHasDesign,
                          hasSite: next,
                        }),
                      );
                    }}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      editHasSite ? "bg-teal-700" : "bg-slate-300"
                    }`}
                    title={
                      editHasSite && !editHasDesign
                        ? "At least one track must remain enabled"
                        : "Toggle Site Track"
                    }
                  >
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                        editHasSite ? "translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </button>
                  <span className="text-xs font-bold text-teal-950 flex items-center gap-1">
                    <span>🏗️</span> Site Track Stage
                  </span>
                </div>
                {editHasSite ? (
                  <span className="text-xs font-mono font-bold text-teal-800">
                    {editSiteProgress}%
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold text-slate-400 uppercase">
                    Disabled
                  </span>
                )}
              </div>

              {editHasSite && (
                <div className="space-y-2.5 pt-2">
                  <StageSelectDropdown
                    track="site"
                    value={editSiteStage}
                    onChange={setEditSiteStage}
                    stages={TRACK_STAGES.site}
                    placeholder="Select milestone..."
                  />

                  <div className="space-y-1 pt-1">
                    <div className="flex items-center justify-between text-[11px] font-medium text-text-muted">
                      <span>Site Execution Progress</span>
                      <span className="font-mono font-bold text-teal-800">
                        {editSiteProgress}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={editSiteProgress}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setEditSiteProgress(val);
                        setEditProgress(
                          calculateOverallProgress({
                            designProgress: editHasDesign ? editDesignProgress : 0,
                            siteProgress: val,
                            hasDesign: editHasDesign,
                            hasSite: true,
                          }),
                        );
                      }}
                      className="w-full h-2 bg-teal-200/70 rounded-lg appearance-none cursor-pointer accent-teal-700"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Overall Composite Progress */}
            <div className="p-3 bg-white rounded-xl border border-border space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-text">Overall Composite Progress</span>
                <span className="text-primary font-mono">{editProgress}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={editProgress}
                onChange={(e) => setEditProgress(Number(e.target.value))}
                className="w-full accent-primary cursor-pointer"
              />
              <p className="text-[10px] text-text-muted">
                Auto-computed from Design ({editDesignProgress}%) and Site (
                {editSiteProgress}%) progress.
              </p>
            </div>
          </div>

          {/* START DATE */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-text block">
              Start Date
            </label>
            <NepaliDatePicker
              value={normalizeDateToISO(editStartDate)}
              onChange={(iso) => setEditStartDate(iso)}
              placeholder="Select start date..."
            />
          </div>

          {/* TARGET DEADLINE */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-text block">
              Target Deadline
            </label>
            <NepaliDatePicker
              value={normalizeDateToISO(editDeadline)}
              onChange={(iso) => setEditDeadline(iso)}
              placeholder="Select target deadline..."
              dropUp={true}
            />
            {editDeadline && (
              <div className="text-[11px] text-text-muted font-medium">
                Formatted: {formatProjectDateNepali(editDeadline)}
              </div>
            )}
          </div>

          {/* TEAM ROLE ASSIGNMENTS (ADMIN ONLY) */}
          {isAdmin ? (
            <div className="pt-2 border-t border-border-light space-y-4">
              <label className="text-xs font-bold text-text block">
                Team Member Scopes (Design vs Site)
              </label>

              {/* 1. Lead Architect Selection & Scope */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted block">
                  {config.leadLabel || "Lead Architect"} (Project Lead)
                </label>
                <select
                  value={editLeadId}
                  onChange={(e) => setEditLeadId(e.target.value)}
                  className="w-full h-10 px-3.5 text-xs sm:text-sm font-medium text-text bg-white border border-border rounded-xl outline-none focus:border-primary cursor-pointer transition-all"
                >
                  <option value="">
                    -- Select {config.leadLabel || "Lead Architect"} --
                  </option>
                  {assignableEmployees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name}
                    </option>
                  ))}
                </select>

                {/* Lead Assigned Scope */}
                <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-surface-muted border border-border-light">
                  <span className="text-[11px] font-semibold text-text-muted">
                    Lead Assigned Scope:
                  </span>
                  <div className="flex items-center gap-1">
                    {ASSIGNED_ROLES.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setEditLeadRole(r.id)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                          editLeadRole === r.id
                            ? r.id === "Site"
                              ? "bg-teal-700 border-teal-700 text-white shadow-2xs font-bold"
                              : r.id === "Both"
                                ? "bg-purple-600 border-purple-600 text-white shadow-2xs font-bold"
                                : r.id === "BOQ"
                                  ? "bg-emerald-600 border-emerald-600 text-white shadow-2xs font-bold"
                                  : "bg-primary border-primary text-white shadow-2xs font-bold"
                            : "bg-white border-border text-text-muted hover:text-text"
                        }`}
                      >
                        <span className="mr-1">{r.icon}</span>
                        <span>{r.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 2. Sub-Architects Roster Selection & Scopes */}
              <div className="space-y-2 pt-1 border-t border-border-light">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted block">
                      {config.subLeadLabel || "Sub-Architects"} (Team Members)
                    </label>
                    <p className="text-[11px] text-text-muted mt-0.5">
                      Click team members to add or remove them from this project:
                    </p>
                  </div>
                  {editSelectedSubIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setEditSelectedSubIds([])}
                      className="text-[11px] text-rose-500 hover:text-rose-700 font-semibold cursor-pointer"
                    >
                      Clear all
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1.5 bg-surface-muted/60 rounded-xl border border-border-light">
                  {assignableEmployees.map((emp) => {
                    const isSelected = editSelectedSubIds.includes(emp.id);
                    return (
                      <button
                        key={emp.id}
                        type="button"
                        onClick={() => toggleEditSubEmp(emp.id)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                          isSelected
                            ? "bg-primary text-white shadow-xs font-semibold"
                            : "bg-white text-text border border-border hover:border-primary/40 hover:bg-surface-muted"
                        }`}
                      >
                        {isSelected ? (
                          <Check size={12} className="text-white" />
                        ) : (
                          <Plus size={12} className="text-text-muted" />
                        )}
                        <span>{emp.name}</span>
                        {isSelected && (
                          <X size={12} className="opacity-70 ml-0.5" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Sub-Architects Assigned Scopes */}
                {editSelectedSubIds.length > 0 && (
                  <div className="p-3 rounded-2xl bg-white border border-border space-y-2 mt-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted block">
                      {config.subLeadLabel || "Sub-Architect"} Assigned Scopes
                    </span>
                    <div className="divide-y divide-border-light">
                      {editSelectedSubIds.map((subId) => {
                        const emp = employees?.find((e) => e.id === subId);
                        const name = emp ? emp.name : subId;
                        const curRole = editSubRoles[subId] || "Design";

                        return (
                          <div
                            key={subId}
                            className="py-2 flex items-center justify-between gap-3"
                          >
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-text truncate">
                                {name}
                              </p>
                              <span className="text-[10px] text-text-muted">
                                {config.subLeadLabel || "Team Member"}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {ASSIGNED_ROLES.map((r) => (
                                <button
                                  key={r.id}
                                  type="button"
                                  onClick={() =>
                                    setEditSubRoles((prev) => ({
                                      ...prev,
                                      [subId]: r.id,
                                    }))
                                  }
                                  className={`px-2 py-1 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer ${
                                    curRole === r.id
                                      ? r.id === "Site"
                                        ? "bg-teal-700 border-teal-700 text-white shadow-2xs font-bold"
                                        : r.id === "Both"
                                          ? "bg-purple-600 border-purple-600 text-white shadow-2xs font-bold"
                                          : r.id === "BOQ"
                                            ? "bg-emerald-600 border-emerald-600 text-white shadow-2xs font-bold"
                                            : "bg-primary border-primary text-white shadow-2xs font-bold"
                                      : "bg-surface-muted border-border text-text-muted hover:bg-white hover:text-text"
                                  }`}
                                >
                                  <span className="mr-1">{r.icon}</span>
                                  <span>{r.label}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* 3. Additional / External Collaborators */}
              <div className="pt-2 border-t border-border-light space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted block">
                  Additional / External Collaborators (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Metal Facade Works, Site Contractor, Consultant..."
                  value={editCustomSubText}
                  onChange={(e) => setEditCustomSubText(e.target.value)}
                  className="w-full h-10 px-3.5 text-xs sm:text-sm font-normal text-text bg-white border border-border rounded-xl outline-none placeholder:text-text-muted/60 focus:border-primary transition-all"
                />
                <p className="text-[10px] text-text-muted">
                  External specialists, contractors, or consultants not in the
                  employee roster.
                </p>
              </div>
            </div>
          ) : (
            <div className="pt-3 border-t border-border-light text-center">
              <p className="text-[11px] text-text-muted italic">
                Project team assignments and scopes are managed by organization
                administrators.
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-border-light px-6 py-3.5 bg-surface-subtle/50 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-text-muted hover:bg-surface-muted rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-primary text-white rounded-xl hover:bg-primary/95 transition-all shadow-xs disabled:opacity-50 cursor-pointer"
          >
            {saving
              ? "Saving..."
              : isAdmin
                ? "Save Changes"
                : "Save Updates"}
          </button>
        </div>
      </div>
    </div>
  );
}

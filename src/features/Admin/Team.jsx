import { useState, useMemo } from "react";
import {
  UserX,
  UserCheck,
  Search,
  LayoutGrid,
  List,
  AlertCircle,
  Users,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../lib/supabaseClient";
import { getEmployeeColor } from "../../constants/colors";

export function AdminTeam({ me }) {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [err, setErr] = useState("");
  const [viewMode, setViewMode] = useState("grid"); // "grid" | "list"

  const query = useQuery({
    queryKey: ["roster"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const setActive = useMutation({
    mutationFn: async ({ id, isActive }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ is_active: isActive })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["roster"] }),
  });

  const employees = query.data || [];

  const filteredEmployees = useMemo(() => {
    return employees.filter((e) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        e.name?.toLowerCase().includes(q) ||
        e.role?.toLowerCase().includes(q) ||
        e.title?.toLowerCase().includes(q) ||
        e.department?.toLowerCase().includes(q)
      );
    });
  }, [employees, search]);

  if (query.isLoading || !query.data) return null;

  const act = async (id, isActive, name) => {
    setErr("");
    const actionText = isActive ? "restore" : "revoke";
    const confirmed = window.confirm(
      `Are you sure you want to ${actionText} workspace access for ${name}?`,
    );
    if (!confirmed) return;

    try {
      await setActive.mutateAsync({ id, isActive });
    } catch (e) {
      setErr(e.message || "Failed to update member status.");
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-4 fade-in pb-8">
      {/* HEADER WITH VIEW TOGGLE */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-text">Team Members</h1>
          <p className="text-xs text-text-muted">
            Manage organization members, roles, departments, and workspace access.
          </p>
        </div>

        {/* GRID / LIST TOGGLE */}
        <div className="h-9 flex items-center bg-surface-muted p-0.5 rounded-xl border border-border-light shadow-2xs self-start sm:self-auto">
          <button
            onClick={() => setViewMode("grid")}
            className={`h-full px-2.5 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
              viewMode === "grid"
                ? "bg-primary text-white shadow-2xs"
                : "text-text-muted hover:text-text"
            }`}
            title="Grid View"
          >
            <LayoutGrid size={14} />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`h-full px-2.5 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
              viewMode === "list"
                ? "bg-primary text-white shadow-2xs"
                : "text-text-muted hover:text-text"
            }`}
            title="List View"
          >
            <List size={14} />
          </button>
        </div>
      </div>

      {err && (
        <div className="p-3 rounded-xl bg-alert-light text-alert text-xs flex items-center gap-2">
          <AlertCircle size={14} className="shrink-0" />
          <span>{err}</span>
        </div>
      )}

      {/* SEARCH BAR */}
      <div className="flex items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-border shadow-2xs">
        <div className="flex items-center gap-2 flex-1">
          <Search size={14} className="text-text-muted shrink-0" />
          <input
            type="text"
            placeholder="Search team members by name, title, department..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs text-text bg-transparent outline-none placeholder:text-text-faint"
          />
        </div>
        <span className="text-xs text-text-muted font-mono shrink-0">
          {filteredEmployees.length} members
        </span>
      </div>

      {/* GRID VIEW */}
      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {filteredEmployees.map((emp) => {
            const isMe = emp.id === me?.id;
            const isActive = emp.is_active !== false;

            return (
              <div
                key={emp.id}
                className={`group bg-white border rounded-2xl p-4 shadow-2xs space-y-3.5 transition-all flex flex-col justify-between ${
                  isActive
                    ? "border-border hover:border-border-light hover:shadow-xs"
                    : "border-border-light bg-surface-muted/30 opacity-70"
                }`}
              >
                <div>
                  {/* CARD TOP ROW: AVATAR & REVOKED TAG IF ANY */}
                  <div className="flex items-start justify-between gap-2">
                    <div
                      className="w-11 h-11 rounded-2xl flex items-center justify-center text-white text-sm font-bold shadow-xs"
                      style={{ backgroundColor: getEmployeeColor(emp) }}
                    >
                      {emp.name?.slice(0, 2).toUpperCase()}
                    </div>

                    {!isActive && (
                      <span className="px-2 py-0.5 rounded-md bg-alert-light text-alert border border-alert/30 text-[10px] font-bold">
                        Access Revoked
                      </span>
                    )}
                  </div>

                  {/* NAME & TITLE */}
                  <div className="mt-3">
                    <h3 className="text-sm font-bold text-text truncate">
                      {emp.name}
                    </h3>
                    <p className="text-[11px] text-text-muted truncate mt-0.5">
                      {emp.title || emp.role || "Team Member"}
                    </p>
                  </div>
                </div>

                {/* BOTTOM ROW: DEPARTMENT PILL & ACCESS ACTION */}
                <div className="pt-2.5 border-t border-border-light flex items-center justify-between text-xs gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-surface-muted text-text-muted border border-border text-[10px] font-semibold capitalize truncate max-w-[120px]">
                    {emp.department || "General"}
                  </span>

                  {!isMe ? (
                    <button
                      onClick={() => act(emp.id, !isActive, emp.name)}
                      className={`text-[11px] px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                        isActive
                          ? "text-alert hover:bg-alert-light border border-transparent hover:border-alert/20"
                          : "text-success hover:bg-success-light border border-transparent hover:border-success/20"
                      }`}
                    >
                      {isActive ? "Revoke" : "Restore"}
                    </button>
                  ) : (
                    <span className="text-[10px] font-mono text-text-muted">
                      (You)
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* LIST VIEW */
        <div className="bg-white border border-border rounded-2xl divide-y divide-border-light overflow-hidden shadow-2xs">
          {filteredEmployees.map((emp) => {
            const isMe = emp.id === me?.id;
            const isActive = emp.is_active !== false;

            return (
              <div
                key={emp.id}
                className={`flex items-center justify-between p-3.5 transition-colors ${
                  isActive ? "hover:bg-surface-muted/30" : "bg-surface-muted/20 opacity-70"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-xs"
                    style={{ backgroundColor: getEmployeeColor(emp) }}
                  >
                    {emp.name?.slice(0, 2).toUpperCase()}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs sm:text-sm font-bold text-text truncate">
                        {emp.name}
                      </h4>
                      {!isActive && (
                        <span className="px-1.5 py-0.2 rounded bg-alert-light text-alert text-[9px] font-bold">
                          Revoked
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-text-muted truncate">
                      {emp.title || emp.role} · {emp.department || "General"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                  {!isMe ? (
                    <button
                      onClick={() => act(emp.id, !isActive, emp.name)}
                      className={`text-[11px] px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                        isActive
                          ? "text-alert hover:bg-alert-light"
                          : "text-success hover:bg-success-light"
                      }`}
                    >
                      {isActive ? "Revoke" : "Restore"}
                    </button>
                  ) : (
                    <span className="text-[10px] font-mono text-text-muted px-2">
                      (You)
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

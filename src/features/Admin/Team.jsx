import { useState, useMemo } from "react";
import {
  UserX,
  UserCheck,
  ShieldCheck,
  User,
  Search,
  Users,
  Shield,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../lib/supabaseClient";
import { Card } from "../../components/Card";
import { StatBlock } from "../../components/StatBlock";

export function AdminTeam({ me }) {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [err, setErr] = useState("");

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
        e.title?.toLowerCase().includes(q)
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

  const activeCount = employees.filter((e) => e.is_active !== false).length;
  const adminCount = employees.filter((e) => e.role === "admin").length;
  const revokedCount = employees.filter((e) => e.is_active === false).length;

  return (
    <div className="max-w-6xl mx-auto space-y-5 fade-in">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-text">Team Members</h1>
          <p className="text-xs text-text-muted mt-1">
            Manage company members, assign administrative roles, and control workspace access.
          </p>
        </div>
      </div>

      {err && (
        <div className="p-3 rounded-xl bg-alert-light text-alert text-xs flex items-center gap-2">
          <AlertCircle size={14} className="shrink-0" />
          <span>{err}</span>
        </div>
      )}

      {/* STATS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatBlock label="Total Members" value={employees.length} />
        <StatBlock label="Active Access" value={activeCount} />
        <StatBlock label="Admins" value={adminCount} />
        <StatBlock
          label="Revoked"
          value={revokedCount}
          accent={revokedCount ? "text-alert" : undefined}
        />
      </div>

      {/* MEMBERS TABLE */}
      <Card
        title="Workspace Roster"
        subtitle={`${filteredEmployees.length} member${
          filteredEmployees.length !== 1 ? "s" : ""
        }`}
        right={
          <div className="flex items-center gap-2 bg-surface-muted px-3 py-1.5 rounded-xl border border-border-light text-xs w-56">
            <Search size={13} className="text-text-muted shrink-0" />
            <input
              type="text"
              placeholder="Search members..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent outline-none text-xs text-text w-full placeholder:text-text-faint"
            />
          </div>
        }
      >
        {filteredEmployees.length === 0 ? (
          <div className="py-8 text-center text-xs text-text-muted">
            No team members matched your search.
          </div>
        ) : (
          <div className="divide-y divide-border-light">
            {filteredEmployees.map((e) => {
              const isMe = e.id === me?.id;
              const isActive = e.is_active !== false;

              return (
                <div
                  key={e.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between py-3 gap-3 hover:bg-surface-muted/30 -mx-4 px-4 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${
                        isActive
                          ? "bg-primary text-white"
                          : "bg-surface-muted text-text-muted border border-border-light"
                      }`}
                    >
                      {e.name?.slice(0, 2).toUpperCase()}
                    </span>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-semibold text-text truncate">
                          {e.name}
                        </h4>
                        {isMe && (
                          <span className="text-[10px] font-semibold bg-primary-light text-primary px-2 py-0.5 rounded-full border border-primary/20">
                            You
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-text-muted flex items-center gap-2 mt-0.5">
                        <span className="flex items-center gap-1 font-medium">
                          {e.role === "admin" ? (
                            <ShieldCheck size={12} className="text-primary" />
                          ) : (
                            <User size={12} className="text-text-muted" />
                          )}
                          <span className="capitalize">{e.role}</span>
                        </span>

                        {e.title && (
                          <>
                            <span>·</span>
                            <span>{e.title}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border-light">
                    {/* STATUS PILL */}
                    {isActive ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-success bg-success-light px-2.5 py-1 rounded-full border border-success/20">
                        <CheckCircle2 size={11} />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-alert bg-alert-light px-2.5 py-1 rounded-full border border-alert/20">
                        <XCircle size={11} />
                        Revoked
                      </span>
                    )}

                    {/* ACTION BUTTON */}
                    {!isMe ? (
                      <button
                        onClick={() => act(e.id, !isActive, e.name)}
                        className={`flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-semibold shadow-xs active:scale-95 transition-all ${
                          isActive
                            ? "bg-white border border-alert/30 text-alert hover:bg-alert hover:text-white"
                            : "bg-success text-white hover:bg-success-dark"
                        }`}
                      >
                        {isActive ? (
                          <>
                            <UserX size={12} />
                            <span>Revoke</span>
                          </>
                        ) : (
                          <>
                            <UserCheck size={12} />
                            <span>Restore</span>
                          </>
                        )}
                      </button>
                    ) : (
                      <span className="w-16 text-center text-[11px] text-text-faint italic">
                        Current
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

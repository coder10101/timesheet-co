import { useState } from "react";
import { UserX, UserCheck, ShieldCheck, User } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../lib/supabaseClient";
import { Card } from "../../components/Card";

export function AdminTeam({ me }) {
  const qc = useQueryClient();
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

  const [err, setErr] = useState("");

  if (query.isLoading || !query.data) return null;
  const employees = query.data;

  const act = async (id, isActive) => {
    setErr("");
    try {
      await setActive.mutateAsync({ id, isActive });
    } catch (e) {
      setErr(e.message);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Team</h1>
        <p className="text-sm text-text-muted mt-1">
          Manage who has access to Trihaus's workspace.
        </p>
      </div>

      {err && <p className="text-[12px] text-alert">{err}</p>}

      <Card title="Members" subtitle={`${employees.length} total`}>
        <div className="divide-y divide-[#EEEAE0]">
          {employees.map((e) => (
            <div
              key={e.id}
              className="flex items-center justify-between py-3 gap-3"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-[11px] font-mono shrink-0">
                  {e.name?.slice(0, 2).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{e.name}</div>
                  <div className="text-[11px] text-text-muted flex items-center gap-1.5">
                    {e.role === "admin" ? (
                      <ShieldCheck size={11} />
                    ) : (
                      <User size={11} />
                    )}
                    {e.role}
                    {!e.is_active && (
                      <span className="text-alert font-medium">· revoked</span>
                    )}
                  </div>
                </div>
              </div>

              {e.id !== me.id ? (
                <button
                  onClick={() => act(e.id, !e.is_active)}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium flex items-center gap-1 shrink-0 ${
                    e.is_active
                      ? "bg-alert text-white"
                      : "bg-success text-white"
                  }`}
                >
                  {e.is_active ? <UserX size={12} /> : <UserCheck size={12} />}
                  {e.is_active ? "Revoke access" : "Restore access"}
                </button>
              ) : (
                <span className="text-[11px] text-text-muted italic shrink-0">
                  You
                </span>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

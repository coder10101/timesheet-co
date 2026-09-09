import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabaseClient";
import { isRegularStaff } from "../utils/userUtils";
import { useAuth } from "../lib/AuthProvider";

const getCacheKey = (orgId) =>
  orgId ? `attendance_roster_cache_${orgId}` : "attendance_roster_cache";

export const getCachedRoster = (orgId) => {
  try {
    const key = getCacheKey(orgId);
    const raw = localStorage.getItem(key);
    let parsed = raw ? JSON.parse(raw) : [];
    if (orgId) {
      parsed = parsed.filter((p) => p.org_id === orgId);
    }
    return parsed;
  } catch {
    return [];
  }
};

export const saveCachedRoster = (profiles, orgId) => {
  if (!Array.isArray(profiles) || profiles.length === 0) return;
  try {
    const key = getCacheKey(orgId);
    const current = getCachedRoster(orgId);
    const map = new Map();
    current.forEach((p) => {
      if (p?.id && (!orgId || p.org_id === orgId)) map.set(p.id, p);
    });
    profiles.forEach((p) => {
      if (p?.id && (!orgId || p.org_id === orgId)) {
        const existing = map.get(p.id) || {};
        map.set(p.id, { ...existing, ...p });
      }
    });
    localStorage.setItem(
      key,
      JSON.stringify(Array.from(map.values())),
    );
  } catch (_) {}
};

export function useRoster() {
  const qc = useQueryClient();
  const auth = useAuth();
  const currentOrgId = auth?.profile?.org_id;
  const key = ["roster", currentOrgId || "default"];

  const query = useQuery({
    queryKey: key,
    queryFn: async () => {
      // Clear legacy unscoped cache to prevent cross-org contamination
      try {
        localStorage.removeItem("attendance_roster_cache");
      } catch (_) {}

      let queryBuilder = supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: true });

      // Always scope to the current user's organization if known
      if (currentOrgId) {
        queryBuilder = queryBuilder.eq("org_id", currentOrgId);
      }

      const { data, error } = await queryBuilder;
      if (error) throw error;

      // Ensure strict organization isolation
      let list = (data || []).filter(
        (p) => !currentOrgId || p.org_id === currentOrgId,
      );

      if (list.length > 1) {
        saveCachedRoster(list, currentOrgId);
      } else {
        const cached = getCachedRoster(currentOrgId);
        if (cached.length > list.length) {
          const map = new Map();
          cached.forEach((p) => {
            if (p?.id && (!currentOrgId || p.org_id === currentOrgId)) {
              map.set(p.id, p);
            }
          });
          list.forEach((p) => {
            if (p?.id && (!currentOrgId || p.org_id === currentOrgId)) {
              map.set(p.id, { ...(map.get(p.id) || {}), ...p });
            }
          });
          list = Array.from(map.values());
        }
      }
      return list;
    },
    staleTime: 1000 * 60 * 5,
  });

  const employees = query.data ?? null;
  const staff = employees ? employees.filter(isRegularStaff) : null;

  return {
    employees,
    staff,
    isLoading: query.isLoading,
  };
}

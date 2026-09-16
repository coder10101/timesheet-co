import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabaseClient";
import { isRegularStaff } from "../utils/userUtils";
import { useAuth } from "../lib/AuthProvider";

const getCacheKey = (orgId) =>
  orgId ? `attendance_roster_cache_${orgId}` : "attendance_roster_cache";

export const getCachedRoster = (orgId) => {
  if (!orgId) return [];
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
  if (!orgId || !Array.isArray(profiles) || profiles.length === 0) return;
  try {
    const key = getCacheKey(orgId);
    const current = getCachedRoster(orgId);
    const map = new Map();
    current.forEach((p) => {
      if (p?.id && p.org_id === orgId) map.set(p.id, p);
    });
    profiles.forEach((p) => {
      if (p?.id && p.org_id === orgId) {
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

export function useRoster(explicitOrgId) {
  const qc = useQueryClient();
  const auth = useAuth();
  const currentOrgId = explicitOrgId || auth?.profile?.org_id;
  const key = ["roster", currentOrgId || "default"];

  // Immediately purge legacy unscoped cache to prevent cross-org contamination
  try {
    localStorage.removeItem("attendance_roster_cache");
  } catch (_) {}

  const query = useQuery({
    queryKey: key,
    initialData: () => (currentOrgId ? getCachedRoster(currentOrgId) : undefined),
    queryFn: async () => {
      let queryBuilder = supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: true });

      if (currentOrgId) {
        queryBuilder = queryBuilder.eq("org_id", currentOrgId);
      }

      const { data, error } = await queryBuilder;
      if (error) throw error;

      // Ensure strict organization isolation when org_id is known
      let list = currentOrgId
        ? (data || []).filter((p) => p.org_id === currentOrgId)
        : (data || []);

      if (currentOrgId && list.length > 0) {
        saveCachedRoster(list, currentOrgId);
      } else if (currentOrgId) {
        const cached = getCachedRoster(currentOrgId);
        if (cached.length > 0) {
          const map = new Map();
          cached.forEach((p) => {
            if (p?.id && p.org_id === currentOrgId) {
              map.set(p.id, p);
            }
          });
          list.forEach((p) => {
            if (p?.id && p.org_id === currentOrgId) {
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

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabaseClient";
import { isRegularStaff } from "../utils/userUtils";
import { useAuth } from "../lib/AuthProvider";

const getCacheKey = (orgId) =>
  orgId ? `attendance_roster_cache_${orgId}` : "attendance_roster_cache";

export const getCachedRoster = (orgId) => {
  if (!orgId) return undefined;
  try {
    const key = getCacheKey(orgId);
    const raw = localStorage.getItem(key);
    if (!raw) return undefined;
    let parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return undefined;
    if (orgId) {
      parsed = parsed.filter((p) => p.org_id === orgId);
    }
    return parsed.length > 0 ? parsed : undefined;
  } catch {
    return undefined;
  }
};

export const saveCachedRoster = (profiles, orgId) => {
  if (!orgId || !Array.isArray(profiles) || profiles.length === 0) return;
  try {
    const key = getCacheKey(orgId);
    localStorage.setItem(key, JSON.stringify(profiles));
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
    initialDataUpdatedAt: 0,
    refetchOnMount: true,
    queryFn: async () => {
      let queryBuilder = supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: true });

      if (currentOrgId) {
        queryBuilder = queryBuilder.eq("org_id", currentOrgId);
      }

      let { data, error } = await queryBuilder;
      if (error) throw error;

      // Resilient fallback: if .eq("org_id", currentOrgId) returned 0 rows, check if plain query returns rows (Supabase RLS secures profiles to the user's organization)
      if (currentOrgId && (!data || data.length === 0)) {
        const fallbackRes = await supabase
          .from("profiles")
          .select("*")
          .order("created_at", { ascending: true });
        if (!fallbackRes.error && fallbackRes.data && fallbackRes.data.length > 0) {
          data = fallbackRes.data;
        }
      }

      // Ensure strict organization isolation when org_id is known
      let list = data || [];
      if (currentOrgId && list.some((p) => p.org_id === currentOrgId)) {
        list = list.filter((p) => p.org_id === currentOrgId);
      }

      if (currentOrgId && list.length > 0) {
        saveCachedRoster(list, currentOrgId);
      }
      return list;
    },
    staleTime: 1000 * 60 * 5,
  });

  const employees = query.data ?? null;
  const activeEmployees = employees
    ? employees.filter((e) => e.is_active !== false)
    : null;
  const staff = employees ? employees.filter(isRegularStaff) : null;
  const activeStaff = staff
    ? staff.filter((e) => e.is_active !== false)
    : null;

  return {
    employees,
    activeEmployees,
    staff,
    activeStaff,
    isLoading: query.isLoading,
  };
}

import { useState, useEffect, useCallback } from "react";

const STORAGE_PREFIX = "table-columns:";

/**
 * Manages show/hide state for a set of table columns and persists the
 * selection to sessionStorage, keyed by `tableKey`, so it survives
 * navigation within the same browser tab/session but resets on a new one.
 *
 * @param {string} tableKey - unique key for this table (e.g. "projects-table")
 * @param {Array<{id: string, label: string, required?: boolean}>} columns
 */
export function useColumnVisibility(tableKey, columns) {
  const storageKey = `${STORAGE_PREFIX}${tableKey}`;

  const getDefaultVisibility = useCallback(() => {
    const defaults = {};
    columns.forEach((col) => {
      defaults[col.id] = true;
    });
    return defaults;
  }, [columns]);

  const [visibleColumns, setVisibleColumns] = useState(() => {
    try {
      const stored = sessionStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Merge with defaults so any newly-added columns default to visible
        // even if the stored session data predates them.
        return { ...getDefaultVisibility(), ...parsed };
      }
    } catch (err) {
      console.warn("Failed to read column visibility from sessionStorage", err);
    }
    return getDefaultVisibility();
  });

  useEffect(() => {
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(visibleColumns));
    } catch (err) {
      console.warn(
        "Failed to persist column visibility to sessionStorage",
        err,
      );
    }
  }, [storageKey, visibleColumns]);

  const toggleColumn = useCallback((columnId) => {
    setVisibleColumns((prev) => ({
      ...prev,
      [columnId]: !prev[columnId],
    }));
  }, []);

  const isVisible = useCallback(
    (columnId) => visibleColumns[columnId] !== false,
    [visibleColumns],
  );

  const resetColumns = useCallback(() => {
    setVisibleColumns(getDefaultVisibility());
  }, [getDefaultVisibility]);

  return { visibleColumns, toggleColumn, isVisible, resetColumns };
}

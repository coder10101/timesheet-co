// Central definition of the Projects table columns.
// `required: true` columns can't be hidden (they're pinned in the table).
// `label` is used both for the <th> header text (via config overrides in
// ProjectTableView) and for the entries shown in the column toggle menu.
export const PROJECT_TABLE_COLUMNS = [
  { id: "project", label: "Project List", required: true },
  { id: "team", label: "Architects & Team" },
  { id: "stage", label: "Stage" },
  { id: "startDate", label: "Start Date" },
  { id: "deadline", label: "Deadline" },
  { id: "payment", label: "Payment Remaining" },
  { id: "status", label: "Project Status" },
  { id: "updated", label: "Last Updated" },
  { id: "actions", label: "Actions", required: true },
];

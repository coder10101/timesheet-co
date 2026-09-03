import LegendItem from "../../../components/Legend";

export default function AttendanceLegend() {
  const items = [
    {
      color: "bg-success",
      label: "Present",
    },
    {
      color: "bg-[#63537E]",
      label: "Site Visit",
    },
    {
      color: "bg-warning",
      label: "Late",
    },
    {
      color: "bg-alert",
      label: "Absent",
    },
    {
      color: "bg-primary",
      label: "Leave",
    },
    {
      color: "bg-border",
      label: "Holiday",
    },
  ];

  return (
    <div className="flex flex-wrap items-center gap-3">
      {items.map((item) => (
        <LegendItem key={item.label} color={item.color} label={item.label} />
      ))}
    </div>
  );
}

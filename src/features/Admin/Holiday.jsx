import { useState } from "react";
import { Plus, Trash2, Landmark, PartyPopper, Building2 } from "lucide-react";
import { useHolidays } from "../../hooks/useOrgData";
import { Card } from "../../components/Card";
import { fmtDate } from "../../utils/workTime";

const CATEGORIES = [
  {
    value: "public",
    label: "Public holiday",
    icon: Landmark,
    color: "#3D6B7D",
  },
  {
    value: "festival",
    label: "Festival (observed)",
    icon: PartyPopper,
    color: "#E0A458",
  },
  {
    value: "company",
    label: "Company day off",
    icon: Building2,
    color: "#6B8F71",
  },
];

export function AdminHolidays({ me }) {
  const { holidays, addHoliday, deleteHoliday } = useHolidays();
  const [date, setDate] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("public");
  const [err, setErr] = useState("");

  if (holidays === null) return null;

  const add = async () => {
    setErr("");
    if (!date || !name.trim()) return setErr("Enter both a date and a name.");
    try {
      await addHoliday({ date, name: name.trim(), category, orgId: me.org_id });
      setDate("");
      setName("");
    } catch (e) {
      setErr(e.message);
    }
  };

  const categoryMeta = (value) =>
    CATEGORIES.find((c) => c.value === value) || CATEGORIES[0];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Holidays</h1>
        <p className="text-sm text-[#7A7362] mt-1">
          Public holidays, observed festival days, and company days off —
          clock-in isn't required on these dates.
        </p>
      </div>

      <Card title="Add a holiday">
        <div className="grid md:grid-cols-4 gap-2 mb-2">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="border border-[#E4DFD3] rounded-lg px-3 py-2 text-sm"
          />
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Dashain (Day 1)"
            className="md:col-span-2 border border-[#E4DFD3] rounded-lg px-3 py-2 text-sm"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="border border-[#E4DFD3] rounded-lg px-3 py-2 text-sm bg-white"
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={add}
          className="px-4 py-2 rounded-lg bg-[#3D6B7D] text-white text-sm font-medium flex items-center gap-1.5"
        >
          <Plus size={15} /> Add holiday
        </button>
        {err && <p className="text-[12px] text-[#B5563A] mt-2">{err}</p>}
      </Card>

      <Card title="All holidays" subtitle={`${holidays.length} total`}>
        {holidays.length === 0 ? (
          <div className="py-6 text-center text-xs text-[#7A7362] border border-dashed border-[#E4DFD3] rounded-lg">
            No holidays added yet — add your first one above.
          </div>
        ) : (
          <div className="divide-y divide-[#EEEAE0]">
            {holidays.map((h) => {
              const meta = categoryMeta(h.category);
              const Icon = meta.icon;
              return (
                <div
                  key={h.id}
                  className="flex items-center justify-between py-2.5"
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                      style={{
                        backgroundColor: `${meta.color}1A`,
                        color: meta.color,
                      }}
                    >
                      <Icon size={13} />
                    </div>
                    <div>
                      <div className="text-sm font-medium">{h.name}</div>
                      <div className="text-[11px] text-[#7A7362] font-mono">
                        {fmtDate(h.date)} · {meta.label}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteHoliday(h.id)}
                    className="p-1.5 rounded-lg text-[#B5563A] hover:bg-[#FDEDEA]"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

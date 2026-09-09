import { Calendar, Clock, Activity } from "lucide-react";
import {
  formatProjectDateNepali,
  formatRelativeTime,
} from "../../../../constants/projectPresets";

export function ProjectTimelineCard({ project }) {
  if (!project) return null;

  return (
    <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-2xs space-y-3.5">
      <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
        <Activity size={16} className="text-slate-400" />
        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
          Timeline & Schedule
        </h3>
      </div>

      <div className="space-y-3 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Created:</span>
          <span className="font-semibold text-slate-700">
            {formatProjectDateNepali(project.created_at)}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-slate-400">Kickoff (Start):</span>
          <span className="font-semibold text-slate-700">
            {formatProjectDateNepali(project.start_date)}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-slate-400">Target Deadline:</span>
          <span className="font-semibold text-slate-700">
            {formatProjectDateNepali(project.end_date || project.deadline)}
          </span>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <span className="text-slate-400">Last Modified:</span>
          <span
            className="font-medium text-slate-600"
            title={project.updated_at}
          >
            {formatRelativeTime(project.updated_at || project.created_at)}
          </span>
        </div>
      </div>
    </div>
  );
}

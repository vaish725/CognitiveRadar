import { ShieldCheck, ShieldAlert } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { ValidationReport } from "@/lib/api";

/** Shows what schema validation accepted and rejected from the model's output. */
export default function ValidationBadge({ report }: { report: ValidationReport | null }) {
  if (!report) return null;

  const rejected = report.nodes.rejected + report.edges.rejected + report.insights.rejected;
  const unresolved = report.insights.unresolvedRefs;
  const truncated = report.input && report.input.analyzedChars < report.input.totalChars;
  const clean = rejected === 0 && unresolved === 0 && !truncated;
  const Icon = clean ? ShieldCheck : ShieldAlert;

  const rows: Array<[string, { received: number; saved: number; rejected: number }]> = [
    ["Nodes", report.nodes],
    ["Links", report.edges],
    ["Insights", report.insights],
  ];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] transition-colors ${
            clean
              ? "border-cr-emerald/30 text-cr-emerald hover:bg-cr-emerald/10"
              : "border-cr-amber/30 text-cr-amber hover:bg-cr-amber/10"
          }`}
          title="Validation report"
        >
          <Icon className="h-3 w-3" />
          {clean ? "Validated" : `${rejected + unresolved} rejected${truncated ? " · truncated" : ""}`}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 text-xs">
        <p className="mb-2 font-medium">Validation report</p>
        <p className="mb-3 text-muted-foreground">
          Model output is checked against the schema before saving. Links must point at nodes the model actually
          created; types must be valid.
        </p>
        <table className="w-full">
          <thead className="text-muted-foreground">
            <tr>
              <th className="text-left font-normal"></th>
              <th className="text-right font-normal">Received</th>
              <th className="text-right font-normal">Saved</th>
              <th className="text-right font-normal">Rejected</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([name, r]) => (
              <tr key={name}>
                <td className="py-0.5">{name}</td>
                <td className="text-right">{r.received}</td>
                <td className="text-right">{r.saved}</td>
                <td className={`text-right ${r.rejected ? "text-cr-amber" : ""}`}>{r.rejected}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {unresolved > 0 && (
          <p className="mt-2 text-cr-amber">
            {unresolved} insight reference{unresolved === 1 ? "" : "s"} pointed at nodes that don't exist and
            {unresolved === 1 ? " was" : " were"} removed.
          </p>
        )}
        {truncated && report.input && (
          <p className="mt-2 text-cr-amber">
            Only the first {report.input.analyzedChars.toLocaleString()} of{" "}
            {report.input.totalChars.toLocaleString()} characters were analyzed.
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
}

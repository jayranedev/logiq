import { formatTime } from "../../utils/helpers";
import useAppStore from "../../stores/appStore";

// Phase 2: streaming event feed
export default function LiveFeed() {
  const events = useAppStore((s) => s.events);

  return (
    <div className="space-y-1">
      {events.slice(0, 10).map((e) => (
        <div key={e.id} className="text-xs text-slate-400 px-2 py-1 rounded bg-slate-800/50">
          <span className="text-slate-500">{formatTime(new Date(e.id))}</span>{" "}
          {e.type}: {JSON.stringify(e).slice(0, 60)}
        </div>
      ))}
    </div>
  );
}

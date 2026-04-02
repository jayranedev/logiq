import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

export default function FactorChart({ factors }) {
  if (!factors || factors.length === 0) return null;

  const data = factors.map((f) => ({
    name: f.feature.replace(/_/g, " "),
    value: Math.round(f.impact * 100) / 100,
    direction: f.direction,
  }));

  return (
    <div className="mt-1">
      <div className="text-[10px] text-slate-500 mb-1 font-medium">
        Contributing Factors (SHAP)
      </div>
      <ResponsiveContainer width="100%" height={factors.length * 24 + 10}>
        <BarChart data={data} layout="vertical" margin={{ left: 0, right: 8, top: 0, bottom: 0 }}>
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 9, fill: "#94a3b8" }}
            width={100}
          />
          <Tooltip
            contentStyle={{
              background: "#1e293b",
              border: "1px solid #334155",
              borderRadius: 6,
              fontSize: 11,
              color: "#f1f5f9",
            }}
            formatter={(val) => [val.toFixed(3), "SHAP impact"]}
          />
          <Bar dataKey="value" radius={[0, 3, 3, 0]}>
            {data.map((entry, i) => (
              <Cell
                key={i}
                fill={
                  entry.direction === "increases_risk" ? "#ef4444" : "#10b981"
                }
                fillOpacity={0.7}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

const OPTIONS = [
  { label: "30s", value: 30 },
  { label: "1 min", value: 60 },
  { label: "1.5 min", value: 90 },
];

export default function DurationSelector({ value, onChange }) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-4 text-white shadow-inner">
      <p className="text-xs uppercase tracking-[0.35em] text-purple-200">
        Round Length
      </p>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {OPTIONS.map((option) => {
          const isActive = option.value === value;
          return (
            <button
              key={option.value}
              onClick={() => onChange(option.value)}
              className={`rounded-2xl px-3 py-3 text-sm font-semibold transition ${
                isActive
                  ? "bg-gradient-to-r from-amber-300 to-orange-400 text-black shadow"
                  : "bg-white/5 text-white"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </section>
  );
}


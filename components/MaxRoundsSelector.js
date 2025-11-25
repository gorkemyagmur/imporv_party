const OPTIONS = [
  { label: "3", value: 3 },
  { label: "5", value: 5 },
  { label: "7", value: 7 },
  { label: "10", value: 10 },
];

export default function MaxRoundsSelector({ value, onChange, disabled }) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-4 text-white shadow-inner">
      <p className="text-xs uppercase tracking-[0.35em] text-purple-200">
        Total Rounds
      </p>
      <div className="mt-3 grid grid-cols-4 gap-2">
        {OPTIONS.map((option) => {
          const isActive = option.value === value;
          return (
            <button
              key={option.value}
              onClick={() => onChange(option.value)}
              disabled={disabled}
              className={`rounded-2xl px-3 py-3 text-sm font-semibold transition ${
                isActive
                  ? "bg-gradient-to-r from-purple-300 to-pink-400 text-black shadow"
                  : "bg-white/5 text-white"
              } disabled:cursor-not-allowed disabled:opacity-50`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </section>
  );
}


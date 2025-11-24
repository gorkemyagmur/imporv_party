export default function ScenarioCard({ title, description }) {
  return (
    <div className="rounded-3xl bg-gradient-to-r from-purple-600/80 via-fuchsia-500/80 to-orange-400/80 p-5 text-white shadow-[0_15px_35px_rgba(0,0,0,0.4)]">
      <p className="text-xs uppercase tracking-[0.3em] text-pink-100">
        Scenario
      </p>
      <h3 className="mt-2 text-2xl font-semibold">{title}</h3>
      <p className="mt-2 text-base text-purple-50">{description}</p>
    </div>
  );
}


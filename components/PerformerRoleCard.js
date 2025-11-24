export default function PerformerRoleCard({ name, role }) {
  return (
    <div className="rounded-3xl border border-white/15 bg-white/10 p-4 shadow-lg">
      <p className="text-xs uppercase tracking-[0.25em] text-purple-200">
        Performer
      </p>
      <h4 className="mt-1 text-xl font-semibold text-white">{name}</h4>
      <p className="mt-2 text-sm text-purple-100">{role}</p>
    </div>
  );
}


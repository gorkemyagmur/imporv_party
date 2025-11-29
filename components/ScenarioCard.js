export default function ScenarioCard({ title, description, story, scene }) {
  return (
    <div className="rounded-3xl bg-gradient-to-r from-purple-600/80 via-fuchsia-500/80 to-orange-400/80 p-5 text-white shadow-[0_15px_35px_rgba(0,0,0,0.4)]">
      <p className="text-xs uppercase tracking-[0.3em] text-pink-100">
        Scenario
      </p>
      <h3 className="mt-2 text-2xl font-semibold">{title}</h3>
      
      {/* Show story if available, otherwise fallback to description */}
      {story && (
        <div className="mt-3 space-y-2">
          <p className="text-sm font-semibold text-pink-100">Hikaye:</p>
          <p className="text-base text-purple-50 leading-relaxed">{story}</p>
        </div>
      )}
      
      {/* Show scene if available */}
      {scene && (
        <div className="mt-3">
          <p className="text-sm font-semibold text-pink-100">Sahne:</p>
          <p className="text-base text-purple-50 leading-relaxed">{scene}</p>
        </div>
      )}
      
      {/* Fallback to description if story/scene not available (backward compatibility) */}
      {!story && !scene && description && (
        <p className="mt-2 text-base text-purple-50">{description}</p>
      )}
    </div>
  );
}


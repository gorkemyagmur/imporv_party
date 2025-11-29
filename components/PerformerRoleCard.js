export default function PerformerRoleCard({ name, role, performerId, currentUserId }) {
  const isCurrentUser = performerId === currentUserId;
  
  // Check if role is an array (new format with side-quests) or string (old format)
  const isArrayRole = Array.isArray(role);
  
  return (
    <div className="rounded-3xl border border-white/15 bg-white/10 p-4 shadow-lg">
      <p className="text-xs uppercase tracking-[0.25em] text-purple-200">
        {isCurrentUser ? "Your Role" : "Performer"}
      </p>
      <h4 className="mt-1 text-xl font-semibold text-white">{name}</h4>
      {role ? (
        isCurrentUser ? (
          <div className="mt-3">
            {isArrayRole ? (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-amber-200 uppercase tracking-wide">Side Quests:</p>
                <ul className="space-y-1.5">
                  {role.map((quest, index) => (
                    <li key={index} className="text-sm text-amber-300 flex items-start gap-2">
                      <span className="text-amber-400 mt-0.5">•</span>
                      <span>{quest}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="mt-2 text-sm font-semibold text-amber-300">{role}</p>
            )}
          </div>
        ) : (
          <div className="mt-3">
            {isArrayRole ? (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-purple-200 uppercase tracking-wide">Side Quests:</p>
                <ul className="space-y-1.5">
                  {role.map((quest, index) => (
                    <li key={index} className="text-sm text-purple-100 flex items-start gap-2">
                      <span className="text-purple-300 mt-0.5">•</span>
                      <span>{quest}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="mt-2 text-sm text-purple-100">{role}</p>
            )}
          </div>
        )
      ) : (
        <p className="mt-2 text-sm text-purple-200 italic">Role hidden</p>
      )}
    </div>
  );
}


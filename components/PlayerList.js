export default function PlayerList({
  players,
  onRemovePlayer,
  isHost = false,
  currentUserId = null,
}) {
  return (
    <section className="rounded-3xl bg-white/10 p-5 shadow-lg shadow-black/40">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Players</h2>
        <span className="text-sm text-purple-100">
          {players.length} / 6 joined
        </span>
      </div>

      <ul className="mt-4 space-y-3">
        {players.map((player) => (
          <li
            key={player.id}
            className="flex items-center justify-between rounded-2xl bg-white/10 px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-pink-500/70 via-purple-500/70 to-indigo-500/70 text-base font-semibold text-white">
                {player.name.slice(0, 2).toUpperCase()}
              </span>
              <div>
                <p className="text-base font-medium text-white">{player.name}</p>
                {isHost && player.id === players.find((p) => p.isHost)?.id && (
                  <p className="text-xs text-amber-300">Host</p>
                )}
              </div>
            </div>
            {isHost && player.id !== currentUserId && (
              <button
                onClick={() => onRemovePlayer(player.id)}
                className="text-sm font-medium text-pink-200 underline decoration-dotted"
              >
                Remove
              </button>
            )}
          </li>
        ))}
        {players.length === 0 && (
          <li className="rounded-2xl bg-white/5 px-4 py-3 text-sm text-purple-100">
            Waiting for players to join...
          </li>
        )}
      </ul>
    </section>
  );
}


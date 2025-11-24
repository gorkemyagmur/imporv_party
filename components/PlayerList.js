export default function PlayerList({
  players,
  playerName,
  onPlayerNameChange,
  onAddPlayer,
  onRemovePlayer,
  isFull,
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
              <p className="text-base font-medium text-white">{player.name}</p>
            </div>
            <button
              onClick={() => onRemovePlayer(player.id)}
              className="text-sm font-medium text-pink-200 underline decoration-dotted"
            >
              Remove
            </button>
          </li>
        ))}
        {players.length === 0 && (
          <li className="rounded-2xl bg-white/5 px-4 py-3 text-sm text-purple-100">
            Add at least three players to start the fun.
          </li>
        )}
      </ul>

      <form
        className="mt-5 flex flex-col gap-3 sm:flex-row"
        onSubmit={onAddPlayer}
      >
        <input
          type="text"
          value={playerName}
          onChange={(event) => onPlayerNameChange(event.target.value)}
          placeholder={isFull ? "Lobby is full" : "Player name"}
          disabled={isFull}
          className="flex-1 rounded-full border border-white/20 bg-white/10 px-4 py-3 text-white placeholder:text-purple-200 focus:border-pink-300 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={isFull}
          className="rounded-full bg-gradient-to-r from-teal-400 to-sky-400 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-sky-500/40 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Add player
        </button>
      </form>

      {isFull && (
        <p className="mt-2 text-xs text-purple-100">
          Lobby limit reached. Remove someone or start a round.
        </p>
      )}
    </section>
  );
}


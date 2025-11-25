import { useEffect, useMemo, useState } from "react";

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const secs = (seconds % 60).toString().padStart(2, "0");
  return `${mins}:${secs}`;
}

export default function CountdownTimer({
  duration = 90,
  isActive,
  onFinish,
  startedAt,
}) {
  const [timeLeft, setTimeLeft] = useState(duration);

  // Calculate time left from Firebase timestamp
  useEffect(() => {
    if (!isActive || !startedAt) {
      setTimeLeft(duration);
      return;
    }

    const updateTimeLeft = () => {
      const now = Date.now();
      const startTime = startedAt?.toMillis ? startedAt.toMillis() : (startedAt?.seconds * 1000) || now;
      const elapsed = Math.floor((now - startTime) / 1000);
      const remaining = Math.max(0, duration - elapsed);
      setTimeLeft(remaining);
      
      if (remaining <= 0) {
        onFinish?.();
      }
    };

    // Update immediately
    updateTimeLeft();

    // Update every second
    const interval = setInterval(updateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [isActive, startedAt, duration, onFinish]);

  useEffect(() => {
    if (!isActive) {
      return undefined;
    }
    if (timeLeft !== 0) {
      return undefined;
    }
    const timeout = setTimeout(() => {
      onFinish?.();
    }, 0);
    return () => clearTimeout(timeout);
  }, [timeLeft, isActive, onFinish]);

  const percent = useMemo(() => {
    return Math.round((timeLeft / duration) * 100);
  }, [timeLeft, duration]);

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-center text-white shadow-inner">
      <p className="text-sm uppercase tracking-[0.5em] text-pink-100">
        Act now!
      </p>
      <div className="mt-4 text-5xl font-semibold">{formatTime(timeLeft)}</div>
      <div className="mt-4 h-3 rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-emerald-300 to-lime-300 transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}


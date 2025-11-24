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
}) {
  const [timeLeft, setTimeLeft] = useState(duration);

  useEffect(() => {
    if (!isActive) {
      return undefined;
    }
    if (timeLeft <= 0) {
      return undefined;
    }

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

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


import { useState, useEffect, useRef } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';

interface TimerProps {
  startedAt?: string;
  durationMinutes?: number;
  remainingSeconds?: number;
  onTimeUp: () => void;
}

export function Timer({ startedAt, durationMinutes, remainingSeconds: initialRemaining, onTimeUp }: TimerProps) {
  const [remaining, setRemaining] = useState(0);
  const firedRef = useRef(false);
  const onTimeUpRef = useRef(onTimeUp);
  onTimeUpRef.current = onTimeUp;

  useEffect(() => {
    let totalMs: number;

    if (initialRemaining !== undefined) {
      totalMs = initialRemaining * 1000;
    } else if (startedAt && durationMinutes) {
      const startTime = new Date(startedAt).getTime();
      if (isNaN(startTime)) return;
      totalMs = durationMinutes * 60 * 1000 - (Date.now() - startTime);
    } else {
      return;
    }

    const tick = () => {
      setRemaining(prev => {
        const next = prev - 1000;
        if (next <= 0 && !firedRef.current) {
          firedRef.current = true;
          onTimeUpRef.current();
        }
        return Math.max(0, next);
      });
    };

    setRemaining(Math.max(0, totalMs));
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [startedAt, durationMinutes, initialRemaining]);

  const totalSecs = Math.ceil(remaining / 1000);
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  const isLow = totalSecs < 300;
  const isCritical = totalSecs < 60;

  const totalDuration = durationMinutes ? durationMinutes * 60 : (initialRemaining ?? totalSecs);
  const percent = totalDuration > 0
    ? ((totalDuration - totalSecs) / totalDuration) * 100
    : 0;

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${isCritical ? 'bg-red-50 border-red-200' : isLow ? 'bg-amber-50 border-amber-200' : 'bg-white border-[#E5E7EB]'}`}>
      <Clock className={`w-4 h-4 ${isCritical ? 'text-red-500 animate-pulse' : isLow ? 'text-amber-500' : 'text-[#6B7280]'}`} />
      <div>
        <span className={`font-mono text-lg font-bold ${isCritical ? 'text-red-600' : isLow ? 'text-amber-600' : 'text-[#1F2937]'}`}>
          {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
        </span>
        <div className="w-full h-1 bg-[#E5E7EB] rounded-full mt-0.5">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${isCritical ? 'bg-red-500' : isLow ? 'bg-amber-500' : 'bg-[#3B82F6]'}`}
            style={{ width: `${Math.min(percent, 100)}%` }}
          />
        </div>
      </div>
      {isCritical && <AlertTriangle className="w-4 h-4 text-red-500 animate-pulse" />}
    </div>
  );
}

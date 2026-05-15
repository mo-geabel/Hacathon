import React, { useState, useEffect } from 'react';

interface CountdownTimerProps {
  minutes: number;
  onExpire?: () => void;
}

export default function CountdownTimer({ minutes, onExpire }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState(minutes * 60);

  useEffect(() => {
    if (timeLeft <= 0) {
      onExpire?.();
      return;
    }

    const timerId = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timerId);
  }, [timeLeft, onExpire]);

  const m = Math.floor(timeLeft / 60);
  const s = timeLeft % 60;

  return (
    <div className="font-mono text-4xl font-bold tracking-wider tabular-nums">
      {m.toString().padStart(2, '0')}:{s.toString().padStart(2, '0')}
    </div>
  );
}


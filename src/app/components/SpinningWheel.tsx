"use client";

import { useState, useCallback, useMemo, useEffect } from "react";

interface SpinResult {
  number: number;
  timestamp: Date;
}

const NUM_SEGMENTS = 90;
const SEGMENT_ANGLE = 360 / NUM_SEGMENTS;
const SPIN_DURATION = 6000;

function polarToCartesian(
  cx: number,
  cy: number,
  r: number,
  angleDeg: number
): { x: number; y: number } {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function describeSegment(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number
): string {
  const start = polarToCartesian(cx, cy, r, startAngle);
  const end = polarToCartesian(cx, cy, r, endAngle);
  const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 1 ${end.x} ${end.y} Z`;
}

export default function SpinningWheel() {
  const [rotation, setRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [result, setResult] = useState<number | null>(null);
  const [history, setHistory] = useState<SpinResult[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const segments = useMemo(() => {
    return Array.from({ length: NUM_SEGMENTS }, (_, i) => {
      const startAngle = i * SEGMENT_ANGLE;
      const endAngle = (i + 1) * SEGMENT_ANGLE;
      const midAngle = startAngle + SEGMENT_ANGLE / 2;
      const isEven = i % 2 === 0;
      const number = i + 1;

      return {
        path: describeSegment(250, 250, 230, startAngle, endAngle),
        midAngle,
        number,
        isEven,
        labelPos: polarToCartesian(250, 250, 185, midAngle),
      };
    });
  }, []);

  const playTick = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 800;
      osc.type = "sine";
      gain.gain.value = 0.05;
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.05);
    } catch {}
  }, [soundEnabled]);

  const playWin = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const ctx = new AudioContext();
      const notes = [523, 659, 784];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = freq;
        osc.type = "sine";
        const start = ctx.currentTime + i * 0.12;
        gain.gain.value = 0.1;
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.3);
        osc.start(start);
        osc.stop(start + 0.3);
      });
    } catch {}
  }, [soundEnabled]);

  const spin = useCallback(() => {
    if (isSpinning) return;

    setIsSpinning(true);
    setShowResult(false);
    setResult(null);

    const randomSegment = Math.floor(Math.random() * NUM_SEGMENTS);
    const segmentCenter = randomSegment * SEGMENT_ANGLE + SEGMENT_ANGLE / 2;
    const targetAngle = 360 - segmentCenter;
    const extraSpins = 360 * (5 + Math.floor(Math.random() * 3));
    const currentRotation = rotation % 360;
    const newRotation = rotation + extraSpins + targetAngle - currentRotation;

    setRotation(newRotation);

    let tickInterval: ReturnType<typeof setInterval>;
    let tickCount = 0;
    const totalTicks = 60;

    tickInterval = setInterval(() => {
      tickCount++;
      if (tickCount < totalTicks * 0.7) {
        playTick();
      }
    }, SPIN_DURATION / totalTicks);

    setTimeout(() => {
      clearInterval(tickInterval);
      setIsSpinning(false);
      setResult(randomSegment + 1);
      setShowResult(true);
      playWin();
      setHistory((prev) => [
        { number: randomSegment + 1, timestamp: new Date() },
        ...prev.slice(0, 9),
      ]);
    }, SPIN_DURATION);
  }, [isSpinning, rotation, playTick, playWin]);

  const reset = useCallback(() => {
    setRotation(0);
    setResult(null);
    setHistory([]);
    setShowResult(false);
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  return (
    <div
      className={`min-h-screen transition-colors duration-500 ${
        darkMode
          ? "bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900"
          : "bg-gradient-to-br from-white via-blue-50 to-green-50"
      }`}
    >
      <div className="flex flex-col items-center justify-center px-4 py-8 min-h-screen">
        {/* Header */}
        <header className="w-full max-w-4xl flex items-center justify-between mb-8">
          <h1
            className={`text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-700 via-blue-500 to-green-500 bg-clip-text text-transparent`}
          >
            Spin & Win
          </h1>
          <div className="flex gap-3">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2.5 rounded-full transition-all duration-300 ${
                darkMode
                  ? "bg-slate-800 hover:bg-slate-700 text-slate-300"
                  : "bg-white hover:bg-blue-50 text-blue-600 shadow-md"
              }`}
              aria-label={soundEnabled ? "Mute" : "Unmute"}
            >
              {soundEnabled ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                </svg>
              )}
            </button>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2.5 rounded-full transition-all duration-300 ${
                darkMode
                  ? "bg-slate-800 hover:bg-slate-700 text-yellow-400"
                  : "bg-white hover:bg-blue-50 text-blue-600 shadow-md"
              }`}
              aria-label="Toggle dark mode"
            >
              {darkMode ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0 .39-.39.39-1.03 0-1.41l-1.06-1.06zm1.06-10.96c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06zM7.05 18.36c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-2.98 0-5.4-2.42-5.4-5.4 0-1.81.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1z" />
                </svg>
              )}
            </button>
          </div>
        </header>

        {/* Result Display */}
        <div className="mb-6 h-24 flex items-center justify-center">
          {showResult && result !== null && (
            <div
              className={`animate-bounce-in text-center ${
                darkMode ? "text-white" : "text-blue-900"
              }`}
            >
              <p
                className={`text-lg font-medium ${
                  darkMode ? "text-slate-400" : "text-slate-500"
                }`}
              >
                Selected Number
              </p>
              <p className="text-6xl md:text-7xl font-black bg-gradient-to-r from-blue-600 to-green-500 bg-clip-text text-transparent">
                {result}
              </p>
            </div>
          )}
        </div>

        {/* Wheel Container */}
        <div className="relative mb-8">
          {/* Outer glow */}
          <div
            className={`absolute inset-0 rounded-full blur-3xl opacity-30 ${
              isSpinning
                ? "bg-gradient-to-r from-blue-500 to-green-500 animate-pulse"
                : ""
            }`}
          />

          {/* Pointer */}
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
            <div className="relative">
              <div
                className={`w-8 h-10 ${
                  isSpinning ? "animate-bounce" : ""
                }`}
              >
                <svg viewBox="0 0 32 40" className="w-full h-full drop-shadow-lg">
                  <defs>
                    <linearGradient id="pointerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#3B82F6" />
                      <stop offset="100%" stopColor="#22C55E" />
                    </linearGradient>
                  </defs>
                  <polygon
                    points="16,40 4,8 16,16 28,8"
                    fill="url(#pointerGrad)"
                    stroke="white"
                    strokeWidth="2"
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* Wheel */}
          <div
            className={`relative w-[320px] h-[320px] md:w-[500px] md:h-[500px] rounded-full overflow-hidden shadow-2xl border-4 ${
              darkMode ? "border-slate-700" : "border-white"
            }`}
            style={{
              transform: `rotate(${rotation}deg)`,
              transition: isSpinning
                ? `transform ${SPIN_DURATION}ms cubic-bezier(0.15, 0.60, 0.10, 1.00)`
                : "none",
            }}
          >
            <svg
              viewBox="0 0 500 500"
              className="w-full h-full"
            >
              {segments.map((seg, i) => (
                <g key={i}>
                  <path
                    d={seg.path}
                    fill={
                      seg.isEven
                        ? darkMode
                          ? "#1E40AF"
                          : "#3B82F6"
                        : darkMode
                        ? "#15803D"
                        : "#22C55E"
                    }
                    stroke={darkMode ? "#0F172A" : "#ffffff"}
                    strokeWidth="0.5"
                  />
                  {i % 3 === 0 && (
                    <text
                      x={seg.labelPos.x}
                      y={seg.labelPos.y}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="white"
                      fontSize="11"
                      fontWeight="bold"
                      transform={`rotate(${seg.midAngle - 90}, ${seg.labelPos.x}, ${seg.labelPos.y})`}
                    >
                      {seg.number}
                    </text>
                  )}
                </g>
              ))}
              {/* Center circle */}
              <circle
                cx="250"
                cy="250"
                r="35"
                fill={darkMode ? "#0F172A" : "#ffffff"}
                stroke={darkMode ? "#1E40AF" : "#3B82F6"}
                strokeWidth="4"
              />
              <text
                x="250"
                y="250"
                textAnchor="middle"
                dominantBaseline="middle"
                fill={darkMode ? "#22C55E" : "#1E3A8A"}
                fontSize="14"
                fontWeight="bold"
              >
                SPIN
              </text>
            </svg>
          </div>
        </div>

        {/* Controls */}
        <div className="flex gap-4 mb-8">
          <button
            onClick={spin}
            disabled={isSpinning}
            className={`
              relative px-12 py-4 rounded-full text-white font-bold text-xl
              transition-all duration-300 transform
              ${
                isSpinning
                  ? "bg-slate-400 cursor-not-allowed scale-95"
                  : "bg-gradient-to-r from-blue-600 to-green-500 hover:from-blue-500 hover:to-green-400 hover:scale-105 hover:shadow-xl active:scale-95 shadow-lg"
              }
            `}
          >
            {isSpinning ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Spinning...
              </span>
            ) : (
              "SPIN"
            )}
          </button>
          <button
            onClick={reset}
            disabled={isSpinning}
            className={`px-6 py-4 rounded-full font-semibold text-lg transition-all duration-300 transform hover:scale-105 active:scale-95 ${
              isSpinning
                ? "bg-slate-200 text-slate-400 cursor-not-allowed dark:bg-slate-800 dark:text-slate-600"
                : darkMode
                ? "bg-slate-800 text-slate-300 hover:bg-slate-700 shadow-lg shadow-slate-900/50"
                : "bg-white text-blue-600 hover:bg-blue-50 shadow-lg shadow-blue-500/20"
            }`}
          >
            Reset
          </button>
        </div>

        {/* History */}
        {history.length > 0 && (
          <div
            className={`w-full max-w-2xl rounded-2xl p-6 transition-colors duration-300 ${
              darkMode
                ? "bg-slate-900/50 border border-slate-800"
                : "bg-white/80 backdrop-blur-sm shadow-xl shadow-blue-500/10"
            }`}
          >
            <h2
              className={`text-lg font-semibold mb-4 ${
                darkMode ? "text-slate-300" : "text-slate-700"
              }`}
            >
              Recent Results
            </h2>
            <div className="flex flex-wrap gap-3">
              {history.map((item, index) => (
                <div
                  key={item.timestamp.getTime()}
                  className={`
                    w-14 h-14 rounded-xl flex items-center justify-center font-bold text-lg
                    transition-all duration-300
                    ${
                      index === 0
                        ? "bg-gradient-to-br from-blue-500 to-green-500 text-white scale-110 shadow-lg"
                        : darkMode
                        ? "bg-slate-800 text-slate-300"
                        : "bg-blue-50 text-blue-700"
                    }
                  `}
                >
                  {item.number}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <footer
          className={`mt-12 text-sm ${
            darkMode ? "text-slate-600" : "text-slate-400"
          }`}
        >
          Press SPIN to try your luck!
        </footer>
      </div>

      <style jsx>{`
        @keyframes bounce-in {
          0% {
            opacity: 0;
            transform: scale(0.3);
          }
          50% {
            opacity: 1;
            transform: scale(1.05);
          }
          70% {
            transform: scale(0.9);
          }
          100% {
            transform: scale(1);
          }
        }
        .animate-bounce-in {
          animation: bounce-in 0.6s ease-out;
        }
      `}</style>
    </div>
  );
}

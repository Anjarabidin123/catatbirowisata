interface MiniRunningBusProps {
  isDriving?: boolean;
  className?: string;
}

export const MiniRunningBus = ({ isDriving = false, className = "" }: MiniRunningBusProps) => {
  return (
    <div className={`relative overflow-hidden w-full h-12 flex items-end ${className}`}>
      {/* Mini Road Track with Road Markings */}
      <div className="absolute bottom-0 left-0 right-0 h-2 bg-slate-700/80 rounded-full overflow-hidden flex items-center">
        {/* Animated Dashed Road Center Line */}
        <div 
          className={`w-[200%] h-0.5 border-b border-dashed border-amber-300/80 ${
            isDriving ? "animate-[road-fast_0.3s_linear_infinite]" : "animate-[road-idle_0.8s_linear_infinite]"
          }`} 
        />
      </div>

      {/* Moving Bus Container */}
      <div 
        className={`relative z-10 transition-transform ${
          isDriving 
            ? "duration-1000 ease-in translate-x-[360px]" 
            : "duration-300 translate-x-1"
        }`}
      >
        <svg
          viewBox="0 0 140 50"
          className="w-24 h-9 drop-shadow-sm overflow-visible"
          xmlns="http://www.w3.org/2000/svg"
        >
          <style>{`
            @keyframes engine-vibe {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(-0.6px); }
            }
            @keyframes wheel-spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
            @keyframes puff-1 {
              0% { transform: translate(0, 0) scale(0.6); opacity: 0.8; }
              100% { transform: translate(-14px, -6px) scale(1.6); opacity: 0; }
            }
            @keyframes puff-2 {
              0% { transform: translate(0, 0) scale(0.4); opacity: 0; }
              40% { opacity: 0.7; }
              100% { transform: translate(-20px, -10px) scale(2.2); opacity: 0; }
            }
            @keyframes road-idle {
              from { transform: translateX(0); }
              to { transform: translateX(-24px); }
            }
            @keyframes road-fast {
              from { transform: translateX(0); }
              to { transform: translateX(-48px); }
            }
          `}</style>

          {/* Exhaust Smoke Puffs from Rear */}
          <g transform="translate(14, 38)">
            <circle
              cx="0"
              cy="0"
              r="2.5"
              fill="#94a3b8"
              className="animate-[puff-1_0.9s_ease-out_infinite]"
              style={{ transformOrigin: "0 0" }}
            />
            <circle
              cx="-2"
              cy="1"
              r="3"
              fill="#cbd5e1"
              className="animate-[puff-2_1.2s_ease-out_infinite_0.4s]"
              style={{ transformOrigin: "-2px 1px" }}
            />
            {isDriving && (
              <circle
                cx="-1"
                cy="0"
                r="3.5"
                fill="#64748b"
                className="animate-[puff-1_0.4s_ease-out_infinite]"
                style={{ transformOrigin: "-1px 0" }}
              />
            )}
          </g>

          {/* Bus Body Group with Engine Idling Vibration */}
          <g className="animate-[engine-vibe_0.25s_ease-in-out_infinite]">
            
            {/* Bus Chassis (Executive Indonesian Coach) */}
            <path
              d="M 18 36 L 22 14 Q 24 9 32 9 L 118 9 Q 128 9 132 17 L 136 36 Q 136 40 130 40 L 24 40 Q 18 40 18 36 Z"
              fill="#ffffff"
              stroke="#0f172a"
              strokeWidth="1.2"
            />

            {/* Aerodynamic Roof Cowling / AC */}
            <path
              d="M 45 9 L 52 6 L 98 6 L 105 9 Z"
              fill="#334155"
            />

            {/* Tinted Panoramic Windows */}
            <path
              d="M 28 13 L 110 13 L 110 27 L 28 27 Z"
              fill="#0f172a"
              opacity="0.85"
            />
            {/* Front Double Glass Windshield */}
            <path
              d="M 113 13 L 126 19 Q 129 22 130 27 L 113 27 Z"
              fill="#0f172a"
              opacity="0.95"
            />

            {/* Window Dividers */}
            <line x1="48" y1="13" x2="48" y2="27" stroke="#475569" strokeWidth="1" />
            <line x1="68" y1="13" x2="68" y2="27" stroke="#475569" strokeWidth="1" />
            <line x1="88" y1="13" x2="88" y2="27" stroke="#475569" strokeWidth="1" />

            {/* Executive Blue Livery Stripe */}
            <path
              d="M 20 31 Q 50 30 80 32 Q 110 34 134 30"
              fill="none"
              stroke="#0284c7"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <path
              d="M 24 34 Q 54 33 84 35 Q 114 37 132 33"
              fill="none"
              stroke="#38bdf8"
              strokeWidth="1.2"
              strokeLinecap="round"
            />

            {/* Front Headlight (Bright Xenon) */}
            <polygon points="132,32 135,31 134,36 131,36" fill="#38bdf8" />

            {/* Taillight */}
            <rect x="17.5" y="27" width="2" height="6" rx="0.5" fill="#ef4444" />

            {/* Exhaust Pipe Tip */}
            <rect x="15" y="37" width="3.5" height="1.5" rx="0.5" fill="#475569" />

            {/* Front Side Mirror (Spion Tanduk) */}
            <path
              d="M 125 11 Q 134 7 136 14"
              fill="none"
              stroke="#0284c7"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
            <ellipse cx="136" cy="15" rx="1.5" ry="2.5" fill="#0284c7" />
          </g>

          {/* Rotating Wheels (Spinning around center) */}
          {/* Rear Wheel (cx=40, cy=40) */}
          <g 
            style={{ 
              transformOrigin: "40px 40px",
              animation: isDriving ? "wheel-spin 0.25s linear infinite" : "wheel-spin 0.6s linear infinite"
            }}
          >
            <circle cx="40" cy="40" r="7.5" fill="#1e293b" stroke="#0f172a" strokeWidth="1.5" />
            <circle cx="40" cy="40" r="4.5" fill="#94a3b8" />
            <circle cx="40" cy="40" r="2" fill="#0f172a" />
            <line x1="40" y1="36" x2="40" y2="44" stroke="#e2e8f0" strokeWidth="1" />
            <line x1="36" y1="40" x2="44" y2="40" stroke="#e2e8f0" strokeWidth="1" />
          </g>

          {/* Front Wheel (cx=112, cy=40) */}
          <g 
            style={{ 
              transformOrigin: "112px 40px",
              animation: isDriving ? "wheel-spin 0.25s linear infinite" : "wheel-spin 0.6s linear infinite"
            }}
          >
            <circle cx="112" cy="40" r="7.5" fill="#1e293b" stroke="#0f172a" strokeWidth="1.5" />
            <circle cx="112" cy="40" r="4.5" fill="#94a3b8" />
            <circle cx="112" cy="40" r="2" fill="#0f172a" />
            <line x1="112" y1="36" x2="112" y2="44" stroke="#e2e8f0" strokeWidth="1" />
            <line x1="108" y1="40" x2="116" y2="40" stroke="#e2e8f0" strokeWidth="1" />
          </g>
        </svg>
      </div>
    </div>
  );
};

export default MiniRunningBus;

const BusAnimation = ({ className = "" }: { className?: string }) => {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <svg
        viewBox="0 0 240 130"
        className="w-full h-full drop-shadow-lg"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Road Surface & Shadow */}
        <ellipse
          cx="120"
          cy="118"
          rx="95"
          ry="6"
          fill="rgba(0, 0, 0, 0.25)"
          className="animate-pulse"
        />

        {/* Bus Container with slight float */}
        <g className="animate-[bounce_3s_ease-in-out_infinite]">
          
          {/* Main Bus Chassis / Body (Modern Jetbus Pariwisata Style) */}
          <path
            d="M 28 85 L 34 38 Q 38 28 50 28 L 195 28 Q 212 28 218 42 L 224 85 Q 224 95 214 95 L 38 95 Q 28 95 28 85 Z"
            fill="url(#bodyMetallic)"
            stroke="#1e293b"
            strokeWidth="1.5"
          />

          {/* Roof AC Unit / Top Cowling */}
          <path
            d="M 75 28 L 85 22 L 165 22 L 175 28 Z"
            fill="#334155"
          />

          {/* Panoramic Double Glass (Kaca Ganda / Double Glass Jetbus) */}
          {/* Top Windshield */}
          <path
            d="M 180 32 L 208 44 Q 212 48 213 54 L 180 54 Z"
            fill="#0f172a"
            opacity="0.9"
          />
          {/* Lower Windshield (Depan) */}
          <path
            d="M 185 58 L 216 58 Q 220 62 221 72 L 185 72 Z"
            fill="#0f172a"
            opacity="0.95"
          />

          {/* Side Passenger Windows (Kaca Samping Tinted) */}
          <path
            d="M 42 36 L 175 36 L 175 68 L 42 68 Z"
            fill="#0f172a"
            opacity="0.88"
          />
          {/* Window Dividers */}
          <line x1="72" y1="36" x2="72" y2="68" stroke="#334155" strokeWidth="1.5" />
          <line x1="105" y1="36" x2="105" y2="68" stroke="#334155" strokeWidth="1.5" />
          <line x1="138" y1="36" x2="138" y2="68" stroke="#334155" strokeWidth="1.5" />

          {/* Elegant Executive Blue Livery */}
          <path
            d="M 30 76 Q 80 74 130 78 Q 175 82 220 74"
            fill="none"
            stroke="#0284c7"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <path
            d="M 36 82 Q 85 80 135 84 Q 180 88 218 80"
            fill="none"
            stroke="#38bdf8"
            strokeWidth="2"
            strokeLinecap="round"
          />

          {/* Executive Tourism Badge Text on Bus */}
          <text x="50" y="88" fill="#ffffff" fontSize="5" fontWeight="bold" letterSpacing="0.5" opacity="0.95">
            TOUR & TRAVEL PARIWISATA
          </text>

          {/* Headlights (Modern Projector LED) */}
          <polygon points="218,78 223,76 222,84 216,84" fill="#38bdf8" />
          {/* Glowing Beam Effect */}
          <path
            d="M 223 76 L 240 68 L 240 92 L 222 84 Z"
            fill="url(#lightBeam)"
            opacity="0.4"
          />

          {/* Front Bumper & Grill */}
          <rect x="205" y="86" width="18" height="6" rx="2" fill="#0f172a" />
          <line x1="208" y1="89" x2="220" y2="89" stroke="#94a3b8" strokeWidth="1" />

          {/* Rear Taillight */}
          <rect x="27" y="65" width="3" height="15" rx="1" fill="#ef4444" />

          {/* Spion Tanduk (Classic Indonesian Big Bus Mirrors) */}
          <path
            d="M 205 32 Q 220 25 225 36"
            fill="none"
            stroke="#0284c7"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <ellipse cx="225" cy="38" rx="2.5" ry="4" fill="#0284c7" />

          {/* Wheels (Alloy Rims with realistic hubs) */}
          {/* Rear Wheel */}
          <g>
            <circle cx="68" cy="95" r="16" fill="#1e293b" stroke="#0f172a" strokeWidth="3" />
            <circle cx="68" cy="95" r="9" fill="#94a3b8" />
            <circle cx="68" cy="95" r="4" fill="#0f172a" />
            {/* Spoke lines */}
            <line x1="68" y1="87" x2="68" y2="103" stroke="#cbd5e1" strokeWidth="1.5" />
            <line x1="60" y1="95" x2="76" y2="95" stroke="#cbd5e1" strokeWidth="1.5" />
          </g>

          {/* Front Wheel */}
          <g>
            <circle cx="178" cy="95" r="16" fill="#1e293b" stroke="#0f172a" strokeWidth="3" />
            <circle cx="178" cy="95" r="9" fill="#94a3b8" />
            <circle cx="178" cy="95" r="4" fill="#0f172a" />
            {/* Spoke lines */}
            <line x1="178" y1="87" x2="178" y2="103" stroke="#cbd5e1" strokeWidth="1.5" />
            <line x1="170" y1="95" x2="186" y2="95" stroke="#cbd5e1" strokeWidth="1.5" />
          </g>

        </g>

        {/* Gradient Definitions */}
        <defs>
          <linearGradient id="bodyMetallic" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="35%" stopColor="#f8fafc" />
            <stop offset="85%" stopColor="#e2e8f0" />
            <stop offset="100%" stopColor="#cbd5e1" />
          </linearGradient>

          {/* Pesona Indonesia Wing Colors */}
          <linearGradient id="pesonaBlue" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#0284c7" />
            <stop offset="100%" stopColor="#0085CD" />
          </linearGradient>

          <linearGradient id="pesonaGreen" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#16a34a" />
            <stop offset="100%" stopColor="#6CB42C" />
          </linearGradient>

          <linearGradient id="pesonaOrange" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ea580c" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>

          <linearGradient id="lightBeam" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
};

export default BusAnimation;

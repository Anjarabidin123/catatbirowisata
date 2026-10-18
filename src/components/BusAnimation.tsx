const BusAnimation = ({ className = "" }: { className?: string }) => {
  return (
    <div className={`relative ${className}`}>
      <svg
        viewBox="0 0 200 120"
        className="w-full h-full animate-bus-float"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Shadow */}
        <ellipse
          cx="100"
          cy="110"
          rx="60"
          ry="8"
          fill="hsl(var(--primary) / 0.2)"
          className="animate-shadow-pulse"
        />
        
        {/* Bus Body */}
        <g className="animate-bus-bounce">
          {/* Main Body */}
          <rect
            x="40"
            y="45"
            width="120"
            height="50"
            rx="8"
            fill="url(#busGradient)"
            stroke="hsl(var(--primary-dark))"
            strokeWidth="2"
          />
          
          {/* Windows */}
          <rect x="50" y="55" width="25" height="20" rx="3" fill="hsl(var(--background) / 0.9)" />
          <rect x="80" y="55" width="25" height="20" rx="3" fill="hsl(var(--background) / 0.9)" />
          <rect x="110" y="55" width="25" height="20" rx="3" fill="hsl(var(--background) / 0.9)" />
          <rect x="140" y="55" width="15" height="20" rx="3" fill="hsl(var(--background) / 0.9)" />
          
          {/* Front light */}
          <circle cx="155" cy="70" r="4" fill="hsl(var(--accent))" className="animate-light-blink" />
          
          {/* Stripe */}
          <rect x="40" y="75" width="120" height="4" fill="hsl(var(--primary-dark) / 0.5)" />
          
          {/* Wheels */}
          <g className="animate-wheel-rotate" style={{ transformOrigin: '70px 95px' }}>
            <circle cx="70" cy="95" r="12" fill="hsl(var(--muted-foreground))" stroke="hsl(var(--primary-dark))" strokeWidth="2" />
            <circle cx="70" cy="95" r="6" fill="hsl(var(--muted))" />
            <line x1="70" y1="89" x2="70" y2="101" stroke="hsl(var(--muted-foreground))" strokeWidth="2" />
            <line x1="64" y1="95" x2="76" y2="95" stroke="hsl(var(--muted-foreground))" strokeWidth="2" />
          </g>
          
          <g className="animate-wheel-rotate" style={{ transformOrigin: '130px 95px' }}>
            <circle cx="130" cy="95" r="12" fill="hsl(var(--muted-foreground))" stroke="hsl(var(--primary-dark))" strokeWidth="2" />
            <circle cx="130" cy="95" r="6" fill="hsl(var(--muted))" />
            <line x1="130" y1="89" x2="130" y2="101" stroke="hsl(var(--muted-foreground))" strokeWidth="2" />
            <line x1="124" y1="95" x2="136" y2="95" stroke="hsl(var(--muted-foreground))" strokeWidth="2" />
          </g>
        </g>
        
        {/* Smoke effect */}
        <g className="animate-smoke-drift">
          <circle cx="30" cy="60" r="4" fill="hsl(var(--muted) / 0.3)" />
          <circle cx="25" cy="65" r="3" fill="hsl(var(--muted) / 0.2)" />
          <circle cx="20" cy="62" r="3" fill="hsl(var(--muted) / 0.15)" />
        </g>
        
        {/* Gradient Definition */}
        <defs>
          <linearGradient id="busGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--primary))" />
            <stop offset="100%" stopColor="hsl(var(--primary-dark))" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
};

export default BusAnimation;

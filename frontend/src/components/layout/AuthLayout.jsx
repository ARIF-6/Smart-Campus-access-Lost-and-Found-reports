import React from 'react';

const AuthLayout = ({ children, title = "Smart Campus", subtitle = "Institutional Login", compact = false }) => {
  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-[#053775] bg-gradient-to-br from-[#024EA9] via-[#053775] to-[#011C40] overflow-hidden p-4">
      
      {/* 1. Deep Background Blurred Spiral Shape (Far Left) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <svg className="absolute -left-[12%] bottom-[5%] w-96 h-[450px] opacity-25 blur-[5px] pointer-events-none" viewBox="0 0 200 300" fill="none">
          <path d="M 50 250 C -20 200, 10 100, 90 140 C 170 180, 140 40, 70 70" stroke="#0284C7" strokeWidth="24" strokeLinecap="round" />
        </svg>
      </div>

      {/* 2. Giant Dark Glassmorphic Panel (Wraps Behind the Login Card to match the reference image) */}
      <div className="absolute w-[94%] h-[90%] max-w-[1200px] max-h-[760px] bg-[#022a5c]/25 backdrop-blur-xl border border-white/[0.07] rounded-[36px] shadow-[0_40px_120px_rgba(0,0,0,0.35)] pointer-events-none z-0 flex items-center justify-center overflow-hidden">
        
        {/* Layered Floating 3D-like Organic Shapes inside the Glass Backdrop */}
        
        {/* A. Top Center Torus Ring */}
        <svg className="absolute top-[8%] left-[32%] w-24 h-24 text-sky-400 drop-shadow-[0_15px_30px_rgba(0,229,255,0.25)] animate-pulse" style={{ animationDuration: '6s' }} viewBox="0 0 100 100">
          <defs>
            <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00E5FF" />
              <stop offset="50%" stopColor="#0288D1" />
              <stop offset="100%" stopColor="#01579B" />
            </linearGradient>
          </defs>
          <path d="M 50 18 A 32 32 0 1 1 49.9 18" fill="none" stroke="url(#ringGrad)" strokeWidth="15" strokeLinecap="round" />
        </svg>

        {/* B. Left Chevron / Zigzag shapes */}
        <svg className="absolute left-[10%] top-[30%] w-28 h-28 drop-shadow-[0_10px_20px_rgba(0,0,0,0.15)] opacity-85" viewBox="0 0 100 100" fill="none">
          <defs>
            <linearGradient id="chevronGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#80E5FF" />
              <stop offset="100%" stopColor="#2F80ED" />
            </linearGradient>
          </defs>
          <path d="M 20 45 L 45 20 L 70 45" stroke="url(#chevronGrad)" strokeWidth="15" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M 20 75 L 45 50 L 70 75" stroke="url(#chevronGrad)" strokeWidth="15" strokeLinecap="round" strokeLinejoin="round" />
        </svg>

        {/* C. Right 3D Helix / Coil Spiral */}
        <svg className="absolute -right-[6%] top-[10%] w-72 h-[500px] opacity-90 drop-shadow-[0_25px_50px_rgba(0,0,0,0.4)]" viewBox="0 0 200 400" fill="none">
          <defs>
            <linearGradient id="spiralGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00B0FF" />
              <stop offset="50%" stopColor="#0055B3" />
              <stop offset="100%" stopColor="#001F4D" />
            </linearGradient>
          </defs>
          <path d="M 120 40 C 180 80, 180 140, 120 160 C 60 180, 40 220, 120 250 C 200 280, 180 340, 100 370" stroke="url(#spiralGrad)" strokeWidth="28" strokeLinecap="round" />
        </svg>

        {/* D. Bottom Right Thick Organic 3D Wave */}
        <svg className="absolute -right-[6%] -bottom-[8%] w-[420px] h-[280px] opacity-90 drop-shadow-[0_25px_60px_rgba(0,0,0,0.45)]" viewBox="0 0 300 200" fill="none">
          <defs>
            <linearGradient id="wormGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38BDF8" />
              <stop offset="50%" stopColor="#0284C7" />
              <stop offset="100%" stopColor="#0369A1" />
            </linearGradient>
          </defs>
          <path d="M 40 140 C 90 70, 170 70, 220 130 C 250 170, 310 140, 340 110" stroke="url(#wormGrad)" strokeWidth="44" strokeLinecap="round" />
        </svg>

        {/* E. Bottom Left 3D C-Shape Tube segment */}
        <svg className="absolute left-[15%] bottom-[10%] w-48 h-48 drop-shadow-[0_15px_35px_rgba(0,0,0,0.3)]" viewBox="0 0 150 150" fill="none">
          <defs>
            <linearGradient id="halfRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#7DD3FC" />
              <stop offset="50%" stopColor="#0284C7" />
              <stop offset="100%" stopColor="#075985" />
            </linearGradient>
          </defs>
          <path d="M 35 115 A 50 50 0 1 1 115 115" fill="none" stroke="url(#halfRingGrad)" strokeWidth="22" strokeLinecap="round" />
        </svg>

        {/* F. Small Waver Squiggles (Right Middle) */}
        <svg className="absolute right-[16%] bottom-[26%] w-24 h-16 opacity-80" viewBox="0 0 100 50" fill="none">
          <path d="M 10 30 Q 25 15, 40 30 T 70 30 T 100 30" stroke="#0EA5E9" strokeWidth="9" strokeLinecap="round" />
          <path d="M 20 42 Q 35 27, 50 42 T 80 42" stroke="#38BDF8" strokeWidth="7" strokeLinecap="round" />
        </svg>
      </div>

      {/* 3. The Login Card itself (Protected from any structure layout changes) */}
      <div className={`w-full ${compact ? 'max-w-sm' : 'max-w-md'} bg-white rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.2)] overflow-hidden transition-all duration-300 ${compact ? 'py-6 px-5 sm:px-8' : 'py-8 px-6 sm:px-10'} z-10`}>
        <div className={`text-center ${compact ? 'mb-5' : 'mb-8'}`}>
          <div className={`mx-auto ${compact ? 'w-14 h-14 mb-3' : 'w-16 h-16 mb-4'} bg-gradient-to-tr from-indigo-600 to-violet-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100`}>
            {/* University SVG icon */}
            <svg xmlns="http://www.w3.org/2000/svg" className={`${compact ? 'h-7 w-7' : 'h-8 w-8'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
            </svg>
          </div>
          <h2 className={`${compact ? 'text-2xl' : 'text-3xl'} font-extrabold text-gray-900 tracking-tight`}>{title}</h2>
          <p className={`text-gray-400 ${compact ? 'text-xs mt-1' : 'text-sm mt-2'} font-semibold tracking-wide uppercase`}>{subtitle}</p>
        </div>
        
        {children}

        {!compact && (
          <div className="mt-8 pt-6 border-t border-gray-100">
            <div className="flex justify-center space-x-6 text-xs text-gray-500 font-medium">
              <a href="#" className="hover:text-indigo-600 transition-colors">Help Desk</a>
              <a href="#" className="hover:text-indigo-600 transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-indigo-600 transition-colors">Terms of Use</a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthLayout;

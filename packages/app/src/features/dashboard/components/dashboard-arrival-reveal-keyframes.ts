export const ARRIVAL_KEYFRAMES = `
  @keyframes navet-dashboard-bake-panel {
    0% { opacity: 1; }
    42% { opacity: 1; }
    56% { opacity: 0; }
    100% { opacity: 0; }
  }

  @keyframes navet-dashboard-bake-logo {
    0% { transform: scale(0.9) rotate(-8deg); opacity: 0; filter: blur(5px); }
    14% { transform: scale(1) rotate(0deg); opacity: 1; filter: blur(0); }
    36% { transform: scale(1.04) rotate(0deg); opacity: 1; filter: blur(0); }
    56% { transform: scale(0.98) rotate(0deg); opacity: 0; filter: blur(4px); }
    100% { transform: scale(0.98) rotate(0deg); opacity: 0; filter: blur(4px); }
  }

  @keyframes navet-dashboard-bake-pulse {
    0% { transform: translate(-50%, -50%) scale(0.82); opacity: 0.12; }
    50% { transform: translate(-50%, -50%) scale(1.05); opacity: 0.34; }
    100% { transform: translate(-50%, -50%) scale(1.26); opacity: 0.08; }
  }

  @keyframes navet-dashboard-bake-orbit {
    0% { transform: rotate(0deg) translateX(0); opacity: 0; }
    18% { opacity: 1; }
    100% { transform: rotate(360deg) translateX(0); opacity: 0; }
  }

  @keyframes navet-dashboard-bake-copy {
    0% { opacity: 0; transform: translateY(12px); }
    16% { opacity: 1; transform: translateY(0); }
    48% { opacity: 1; transform: translateY(0); }
    60% { opacity: 0; transform: translateY(-8px); }
    100% { opacity: 0; transform: translateY(-8px); }
  }

  @keyframes navet-dashboard-reveal-ring {
    0% { transform: translate(-50%, -50%) scale(0.68); opacity: 0; }
    18% { opacity: 0.95; }
    56% { opacity: 0.32; }
    72% { transform: translate(-50%, -50%) scale(1.55); opacity: 0; }
    100% { transform: translate(-50%, -50%) scale(1.55); opacity: 0; }
  }

  @keyframes navet-dashboard-reveal-glow {
    0% { transform: translate(-50%, -50%) scale(0.8); opacity: 0; }
    24% { opacity: 1; }
    100% { transform: translate(-50%, -50%) scale(1.18); opacity: 0.2; }
  }

  @keyframes navet-dashboard-reveal-card {
    0% { transform: translateY(22px) scale(0.96); opacity: 0; }
    62% { transform: translateY(0) scale(1.012); opacity: 1; }
    100% { transform: translateY(0) scale(1); opacity: 1; }
  }

  @keyframes navet-dashboard-reveal-line {
    0% { transform: scaleX(0.15); opacity: 0; }
    28% { transform: scaleX(1); opacity: 1; }
    100% { transform: scaleX(1.08); opacity: 0; }
  }

  @keyframes navet-dashboard-reveal-logo {
    0% { transform: scale(0.82); opacity: 0; filter: blur(6px); }
    62% { transform: scale(1.03); opacity: 1; filter: blur(0); }
    100% { transform: scale(1); opacity: 1; filter: blur(0); }
  }

  @keyframes navet-dashboard-exit-shell {
    0% { opacity: 1; }
    100% { opacity: 0; }
  }

  @keyframes navet-dashboard-exit-card {
    0% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
    100% { opacity: 0; transform: translateY(16px) scale(0.985); filter: blur(8px); }
  }

  @keyframes navet-arrival-ambient-drift {
    0% { transform: translate3d(-3%, -2%, 0) scale(1); }
    50% { transform: translate3d(3%, 2%, 0) scale(1.06); }
    100% { transform: translate3d(-1%, 3%, 0) scale(1.02); }
  }

  @keyframes navet-arrival-ambient-drift-reverse {
    0% { transform: translate3d(2%, 3%, 0) scale(1.04); }
    50% { transform: translate3d(-4%, -2%, 0) scale(1); }
    100% { transform: translate3d(3%, -1%, 0) scale(1.05); }
  }

  @keyframes navet-arrival-grid-float {
    0% { transform: translateY(0); opacity: 0.1; }
    50% { transform: translateY(-1.1%); opacity: 0.18; }
    100% { transform: translateY(0.6%); opacity: 0.12; }
  }

  @keyframes navet-arrival-halo {
    0%, 100% { transform: translate(-50%, -50%) scale(0.94); opacity: 0.28; }
    50% { transform: translate(-50%, -50%) scale(1.06); opacity: 0.48; }
  }
`;

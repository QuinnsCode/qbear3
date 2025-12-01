// app/styles/SanctumStyles.tsx
export function SanctumStyles() {
    return (
      <style dangerouslySetInnerHTML={{__html: `
        /* ------------------------------------------------------------------- */
        /* NECROMANCER SANCTUM STYLES - HIGH REALISM & PERFORMANCE OPTIMIZED */
        /* Focus: Depth, Texture, and Aged Parchment effects using pure CSS */
        /* ------------------------------------------------------------------- */

        /* Base container */
        .sanctum-container {
          min-height: 100vh;
          position: relative;
          overflow: hidden;
          /* Deeper, richer background with subtle texture */
          background: linear-gradient(135deg, #180b06 0%, #0d0603 60%, #000000 100%);
        }
  
        /* Ambient glow effect - enhanced color depth and animation */
        .ambient-glow {
          position: absolute;
          top: 20%;
          left: 20%;
          width: 500px;
          height: 500px;
          background: rgba(255, 127, 80, 0.05); /* Softer, slightly orange-red glow */
          border-radius: 50%;
          filter: blur(100px); /* Smoother blur */
          pointer-events: none;
          animation: pulse 15s infinite alternate ease-in-out;
          z-index: 1;
        }

        @keyframes pulse {
            0% { opacity: 0.6; transform: scale(1) translate(0, 0); }
            50% { opacity: 0.7; transform: scale(1.05) translate(10px, -10px); }
            100% { opacity: 0.6; transform: scale(1) translate(0, 0); }
        }
  
        /* Main wrapper */
        .main-wrapper {
          position: relative;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.5rem;
          filter: drop-shadow(0 0 10px rgba(0,0,0,0.5));
          z-index: 10;
        }
  
        .content-wrapper {
          position: relative;
          width: 100%;
          max-width: 1500px; 
          min-height: 600px;
        }
  
        /* Book frame (Aged Leather/Dark Wood) */
        .book-frame-placeholder {
          position: absolute;
          inset: 0;
          border-radius: 12px; 
          /* Richer, more complex wood grain/leather gradient */
          background: linear-gradient(135deg, #4d2e1b 0%, #2e1b0d 50%, #150c05 100%);
          border: 6px solid #1c0e08; 
          /* Enhanced 3D bevel and deep drop shadow */
          box-shadow: 
            inset 0 0 60px rgba(0,0,0,0.9), /* Deep inner darkness */
            0 25px 50px rgba(0,0,0,0.95), /* Heavy lift/drop shadow */
            0 0 10px rgba(77, 46, 27, 0.3); /* Subtle outer glow of the material */
          z-index: 5;
        }
  
        /* Corner decorations - metal-like studs/filigree */
        .corner-decoration {
          position: absolute;
          width: 24px;
          height: 24px;
          /* Simulating aged bronze/brass */
          background: linear-gradient(145deg, #a87e59, #6a4f38, #a87e59);
          border: 1px solid #4a3321;
          transform: rotate(45deg);
          box-shadow: 0 1px 3px rgba(0,0,0,0.5), inset 0 0 5px rgba(255,255,255,0.1);
          z-index: 6;
        }
  
        .corner-decoration.top-left { top: 18px; left: 18px; }
        .corner-decoration.top-right { top: 18px; right: 18px; }
        .corner-decoration.bottom-left { bottom: 18px; left: 18px; }
        .corner-decoration.bottom-right { bottom: 18px; right: 18px; }
  
        /* Parchment background (The Paper) */
        .parchment-background {
          position: relative;
          margin: 20px;
          border-radius: 6px;
          /* Deeper, more varied parchment color */
          background: linear-gradient(150deg, #f7ecc9 0%, #e8d5a8 40%, #dcc794 80%, #c8b584 100%);
          min-height: 500px;
          /* Subtle inner shadow for page indentation */
          box-shadow: 
            inset 0 0 40px rgba(139, 69, 19, 0.3),
            0 5px 15px rgba(0,0,0,0.2); /* Soft drop shadow */
          z-index: 7;
        }

        /* Paper Grain/Texture via pseudo-element */
        .parchment-background::before {
            content: '';
            position: absolute;
            inset: 0;
            opacity: 0.2; /* Very faint */
            border-radius: 6px;
            /* Repeating gradient for a subtle, woven paper fiber/grain texture */
            background: repeating-linear-gradient(
                0deg,
                rgba(0,0,0,.08),
                rgba(0,0,0,.08) 1px,
                transparent 1px,
                transparent 2px
            ), repeating-linear-gradient(
                90deg,
                rgba(0,0,0,.05),
                rgba(0,0,0,.05) 1px,
                transparent 1px,
                transparent 2px
            );
            pointer-events: none;
            z-index: 8;
        }

        /* Book binding (Spine) */
        .book-binding {
          position: absolute;
          left: 50%;
          top: 20px;
          bottom: 20px;
          transform: translateX(-50%);
          width: 16px; /* Wider binding */
          /* Complex gradient for high-contrast leather spine */
          background: linear-gradient(to bottom, #4d2e1b 0%, #1e0f08 50%, #4d2e1b 100%);
          /* Stronger shadow for 3D cylinder effect */
          box-shadow: 
            inset -3px 0 6px rgba(0,0,0,0.8), 
            inset 3px 0 6px rgba(0,0,0,0.8),
            0 0 10px rgba(0,0,0,0.5);
          display: none;
          z-index: 9;
        }
  
        .binding-stud {
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
          width: 10px;
          height: 10px;
          /* Metal stud effect */
          background: radial-gradient(circle at 3px 3px, #cc8844, #92400e);
          border-radius: 50%;
          border: 1px solid #4d2e1b;
          box-shadow: inset 0 0 2px rgba(255,255,255,0.4);
          z-index: 10;
        }
  
        /* Page grid */
        .page-grid {
          display: grid;
          grid-template-columns: 1fr;
          height: 100%;
          gap: 0;
        }
  
        .left-page, .right-page {
          padding: 30px; /* More padding */
        }
  
        .right-page {
          border-top: 2px solid rgba(180, 83, 9, 0.3);
        }
  
        /* Typography */
        .sanctum-title {
          font-size: 28px;
          font-weight: 700;
          color: #6d3319; /* Deeper brown ink */
          margin-bottom: 12px;
          text-shadow: 1px 1px 1px rgba(255, 255, 255, 0.5); /* Ink bleed effect */
        }
  
        .sanctum-subtitle {
          font-size: 14px;
          color: #8c5d2e;
          font-style: italic;
        }
  
        .sanctum-divider {
          height: 3px; /* Thicker divider */
          width: 100%;
          margin-top: 15px;
          /* Darker, etched line */
          background: linear-gradient(to right, transparent 0%, #6d3319 20%, #4d2e1b 50%, #6d3319 80%, transparent 100%);
          box-shadow: 0 1px 1px rgba(255, 255, 255, 0.2);
        }
  
        .section-title {
          font-size: 18px;
          font-weight: 600;
          color: #6d3319;
          margin-bottom: 15px;
        }
  
        /* Action buttons - Etched Stone/Brass Plate */
        .action-button {
          display: flex;
          align-items: center;
          padding: 14px;
          background: linear-gradient(180deg, rgba(251, 191, 36, 0.2), rgba(251, 191, 36, 0.1));
          border: 2px solid rgba(110, 50, 20, 0.8); /* Darker, higher contrast border */
          border-radius: 10px;
          color: #6d3319;
          font-weight: 600;
          font-size: 15px;
          transition: all 0.2s;
          box-shadow: 0 4px 6px rgba(0,0,0,0.3); /* Subtle lift */
        }
  
        .action-button:hover {
          background: linear-gradient(180deg, rgba(251, 191, 36, 0.3), rgba(251, 191, 36, 0.2));
          border-color: rgba(180, 83, 9, 1);
          transform: translateY(1px); /* Slight press down */
          box-shadow: 0 2px 4px rgba(0,0,0,0.5); /* Pressed shadow */
        }
  
        .action-button-icon {
          font-size: 24px; /* Larger icons */
          margin-right: 12px;
        }
  
        /* Status box - carved from dark stone */
        .status-box {
          padding: 16px;
          border-radius: 8px;
          border: 2px solid rgba(77, 46, 27, 0.5);
          background: rgba(30, 15, 8, 0.8); /* Dark background for high contrast text */
          margin-bottom: 24px;
          box-shadow: inset 0 0 10px rgba(0,0,0,0.5);
        }
  
        .status-title {
          font-weight: 700;
          color: #f7ecc9; /* Lighter text color */
          margin-bottom: 10px;
          font-size: 14px;
          text-shadow: 0 0 5px rgba(255, 255, 255, 0.2);
        }
  
        .status-item {
          display: flex;
          justify-content: space-between;
          font-size: 14px;
          color: #e8d5a8;
        }

        /* Game cards */
        .game-card {
            border: 2px solid rgba(110, 50, 20, 0.5); 
            border-radius: 8px;
            padding: 16px;
            background: rgba(251, 191, 36, 0.1); /* Lighter background */
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
      
        .game-card-title {
            font-weight: 700;
            color: #6d3319;
            font-size: 16px;
        }
      
        .game-card-badge {
            font-size: 11px;
            color: #b45309;
            background: rgba(217, 119, 6, 0.15);
            padding: 3px 10px;
            border-radius: 6px;
        }

        .game-link {
            border: 1px solid rgba(146, 64, 14, 0.6);
            background: rgba(146, 64, 14, 0.3);
            border-radius: 6px;
            padding: 8px 16px;
        }
      
        /* Empty state */
        .empty-state {
            border: 3px dashed rgba(110, 50, 20, 0.5);
            background: rgba(251, 191, 36, 0.03);
        }
      
        .empty-state-icon {
            color: #6d3319;
        }

        /* Create game button */
        .create-game-button {
            border: 3px dashed rgba(110, 50, 20, 0.5);
        }
        
        .create-game-button:hover {
            background: rgba(251, 191, 36, 0.1);
            border-color: rgba(180, 83, 9, 0.7);
        }

        /* Footer */
        .footer-nav {
          border-top: 2px solid rgba(180, 83, 9, 0.4);
        }
  
        /* Mobile landscape */
        @media (max-height: 600px) and (orientation: landscape) {
            .sanctum-container { min-height: auto; }
            .main-wrapper { padding: 0.5rem; min-height: auto; align-items: flex-start; }
            .content-wrapper { min-height: auto; }
            .parchment-background { margin: 8px; min-height: auto; }
            .left-page, .right-page { padding: 16px; }
            .ambient-glow { width: 200px; height: 200px; }
            .corner-decoration { width: 16px; height: 16px; }
        }
  
        /* Tablet and above */
        @media (min-width: 768px) {
          .book-binding { display: block; }
          .page-grid { grid-template-columns: 1fr 1fr; gap: 24px; }
          .left-page { padding: 40px 60px 40px 40px; }
          .right-page { padding: 40px 40px 40px 60px; border-top: none; }
          .parchment-background { margin: 24px; min-height: 700px; }
          .main-wrapper { padding: 2rem; }
        }
  
        /* Desktop */
        @media (min-width: 1024px) {
          .left-page { padding: 60px 80px 60px 60px; }
          .right-page { padding: 60px 60px 60px 80px; }
          .parchment-background { margin: 30px; min-height: 800px; }
          .main-wrapper { padding: 2.5rem; }
          .content-wrapper { max-width: 1600px; min-height: 900px; }
          .corner-decoration { width: 28px; height: 28px; }
        }
      `}} />
    );
}
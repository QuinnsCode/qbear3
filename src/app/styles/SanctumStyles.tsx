// app/styles/SanctumStyles.tsx
export function SanctumStyles() {
  return (
    <style dangerouslySetInnerHTML={{__html: `
      /* Custom animations and effects that Tailwind doesn't cover */
      @keyframes shimmer {
        0% { background-position: -1000px 0; }
        100% { background-position: 1000px 0; }
      }

      .sanctum-shimmer {
        background: linear-gradient(
          90deg,
          rgba(255, 255, 255, 0) 0%,
          rgba(255, 255, 255, 0.1) 50%,
          rgba(255, 255, 255, 0) 100%
        );
        background-size: 1000px 100%;
        animation: shimmer 2s infinite;
      }

      /* Smooth scrollbar for dark theme */
      .sanctum-container ::-webkit-scrollbar {
        width: 8px;
        height: 8px;
      }

      .sanctum-container ::-webkit-scrollbar-track {
        background: #1e293b;
      }

      .sanctum-container ::-webkit-scrollbar-thumb {
        background: #475569;
        border-radius: 4px;
      }

      .sanctum-container ::-webkit-scrollbar-thumb:hover {
        background: #64748b;
      }
    `}} />
  );
}
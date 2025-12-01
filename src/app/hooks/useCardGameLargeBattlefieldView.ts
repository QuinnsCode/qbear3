// @/app/hooks/useCardGameLargeBattlefieldView.ts
import { useState } from 'react';

export function useCardGameLargeBattlefieldView() {
  const [isLargeBattlefieldView, setIsLargeBattlefieldView] = useState(false);
  
  const toggleLargeBattlefieldView = () => {
    setIsLargeBattlefieldView(!isLargeBattlefieldView);
  };
  
  return {
    isLargeBattlefieldView,
    toggleLargeBattlefieldView,
  };
}
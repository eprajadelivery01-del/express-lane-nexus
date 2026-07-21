import { useCallback } from "react";

const ALERT_SOUND_URL = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";

let globalAudio: HTMLAudioElement | null = null;
let isUnlocked = false;

if (typeof window !== "undefined") {
  globalAudio = new Audio(ALERT_SOUND_URL);
  globalAudio.load();

  const unlockGlobalAudio = () => {
    if (isUnlocked || !globalAudio) return;
    globalAudio.volume = 0;
    globalAudio.play()
      .then(() => {
        isUnlocked = true;
        window.removeEventListener('click', unlockGlobalAudio);
        window.removeEventListener('touchstart', unlockGlobalAudio);
        window.removeEventListener('keydown', unlockGlobalAudio);
      })
      .catch(() => {
        // browser block
      });
  };

  window.addEventListener('click', unlockGlobalAudio);
  window.addEventListener('touchstart', unlockGlobalAudio);
  window.addEventListener('keydown', unlockGlobalAudio);
}

export function useAudioAlert() {
  const playAlert = useCallback(() => {
    if (globalAudio) {
      globalAudio.currentTime = 0;
      globalAudio.volume = 1.0;
      globalAudio.play().catch(e => {
        console.warn("[AudioAlert] Falha ao tocar alerta:", e);
      });
    }
  }, []);

  return { playAlert };
}

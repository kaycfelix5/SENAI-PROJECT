// Centralized State Engine & Web Audio Utilities for Heart Tech Care

// Seed inicial vazia (sem dados falsos/de exemplo)
const FAKE_NAMES = ["Patrícia Mendes", "Lucas Silveira", "Sofia Mendes", "Admin", "Administrador Geral", "Gabriel Ramos", "Beatriz Lima"];

const DEFAULT_USERS_DB = [];
const DEFAULT_PORTADORES = [];
const DEFAULT_DISPONIVEIS = [];

// Helper to broadcast state changes across components
export const broadcastSync = () => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("neurocare_state_updated"));
  }
};

// Storage Getters and Setters
export const getStoredUsers = () => {
  if (typeof window === "undefined") return [];
  const saved = localStorage.getItem("hearttech_users_db");
  if (!saved) return [];
  try {
    const parsed = JSON.parse(saved);
    const cleaned = Array.isArray(parsed) ? parsed.filter(u => !FAKE_NAMES.includes(u.name)) : [];
    if (cleaned.length !== parsed.length) {
      localStorage.setItem("hearttech_users_db", JSON.stringify(cleaned));
    }
    return cleaned;
  } catch {
    return [];
  }
};

export const getStoredPortadores = () => {
  if (typeof window === "undefined") return [];
  const saved = localStorage.getItem("hearttech_portadores_db");
  if (!saved) return [];
  try {
    const parsed = JSON.parse(saved);
    const cleaned = Array.isArray(parsed) ? parsed.filter(p => !FAKE_NAMES.includes(p.nome)) : [];
    if (cleaned.length !== parsed.length) {
      localStorage.setItem("hearttech_portadores_db", JSON.stringify(cleaned));
    }
    return cleaned;
  } catch {
    return [];
  }
};

export const saveStoredPortadores = (portadores) => {
  if (typeof window !== "undefined") {
    localStorage.setItem("hearttech_portadores_db", JSON.stringify(portadores));
    broadcastSync();
  }
};

export const getStoredDisponiveis = () => {
  if (typeof window === "undefined") return [];
  const saved = localStorage.getItem("hearttech_disponiveis_db");
  if (!saved) return [];
  try {
    const parsed = JSON.parse(saved);
    const cleaned = Array.isArray(parsed) ? parsed.filter(p => !FAKE_NAMES.includes(p.nome)) : [];
    if (cleaned.length !== parsed.length) {
      localStorage.setItem("hearttech_disponiveis_db", JSON.stringify(cleaned));
    }
    return cleaned;
  } catch {
    return [];
  }
};

export const saveStoredDisponiveis = (disponiveis) => {
  if (typeof window !== "undefined") {
    localStorage.setItem("hearttech_disponiveis_db", JSON.stringify(disponiveis));
    broadcastSync();
  }
};

// Real Web Audio API Synthesizer (Sensory Friendly Chimes & Alerts)
export const playSoundEffect = (type = "chime") => {
  if (typeof window === "undefined") return;
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    if (type === "chime") {
      // Gentle soothing bell (440Hz -> 880Hz harmonic)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.exponentialRampToValueAtTime(659.25, ctx.currentTime + 0.3); // E5
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.8);
    } else if (type === "success") {
      // Happy chord progression
      [523.25, 659.25, 783.99].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.1);
        gain.gain.setValueAtTime(0.15, ctx.currentTime + i * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.1 + 0.5);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.1);
        osc.stop(ctx.currentTime + i * 0.1 + 0.5);
      });
    } else if (type === "alert") {
      // Gentle warning chime
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.setValueAtTime(330, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } else if (type === "emergency") {
      // Soft pulsing alert
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(440, ctx.currentTime + 0.25);
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.5);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.75);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.75);
    }
  } catch (err) {
    console.warn("Web Audio not supported or blocked by user interaction:", err);
  }
};

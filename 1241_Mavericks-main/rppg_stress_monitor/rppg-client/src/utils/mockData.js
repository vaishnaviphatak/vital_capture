// Synthetic physiological waveform & sample data generator for interactive exploration

export const PRESET_PROFILES = {
  resting: {
    label: 'Resting / Normal',
    bpm: 72,
    rmssd: 54.2,
    resp_rate: 14.5,
    stress: 'Low',
    stressScore: 28,
    color: '#00ff88',
    description: 'Calm, parasympathetic dominance with steady heart rate and high HRV.'
  },
  stress: {
    label: 'High Cognitive Load',
    bpm: 94,
    rmssd: 22.8,
    resp_rate: 22.0,
    stress: 'High',
    stressScore: 86,
    color: '#ff2a5f',
    description: 'Sympathetic arousal detected. Low HRV with elevated heart and respiration rates.'
  },
  focused: {
    label: 'Active Workflow',
    bpm: 81,
    rmssd: 38.5,
    resp_rate: 17.2,
    stress: 'Moderate',
    stressScore: 52,
    color: '#ffaa00',
    description: 'Optimal engagement balance, typical during problem solving and deep focus.'
  },
  workout: {
    label: 'Post-Workout / Cardio',
    bpm: 118,
    rmssd: 18.4,
    resp_rate: 28.0,
    stress: 'High',
    stressScore: 78,
    color: '#3b82f6',
    description: 'Cardiovascular exertion response with elevated cardiac output.'
  }
};

export function generateSyntheticWaveform(bpm = 75, length = 120, noiseLevel = 0.05) {
  const points = [];
  const freq = bpm / 60; // Hz
  const sampleRate = 30; // 30 FPS
  
  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    // Photoplethysmogram pulse wave model (systolic peak + dicrotic notch)
    const phase = (t * freq * 2 * Math.PI) % (2 * Math.PI);
    const systolic = Math.exp(-Math.pow((phase - 1.2), 2) / 0.35) * 1.0;
    const dicrotic = Math.exp(-Math.pow((phase - 2.8), 2) / 0.5) * 0.35;
    const respiratoryModulation = Math.sin(t * 0.25 * 2 * Math.PI) * 0.1;
    const noise = (Math.random() - 0.5) * noiseLevel;
    
    const value = systolic + dicrotic + respiratoryModulation + noise;
    points.push(parseFloat(value.toFixed(3)));
  }
  return points;
}

export const SAMPLE_HISTORY_DATA = [
  {
    id: 101,
    timestamp: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
    bpm: 71.4,
    rmssd: 58.2,
    resp_rate: 13.8,
    stress_lvl: 'Low',
    tag: 'Meditation'
  },
  {
    id: 102,
    timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    bpm: 88.6,
    rmssd: 28.4,
    resp_rate: 19.5,
    stress_lvl: 'Moderate',
    tag: 'Team Sync'
  },
  {
    id: 103,
    timestamp: new Date(Date.now() - 1000 * 60 * 340).toISOString(),
    bpm: 96.2,
    rmssd: 21.0,
    resp_rate: 23.1,
    stress_lvl: 'High',
    tag: 'Deadline Rush'
  },
  {
    id: 104,
    timestamp: new Date(Date.now() - 1000 * 60 * 600).toISOString(),
    bpm: 68.0,
    rmssd: 64.5,
    resp_rate: 12.4,
    stress_lvl: 'Low',
    tag: 'Morning Baseline'
  },
  {
    id: 105,
    timestamp: new Date(Date.now() - 1000 * 60 * 1440).toISOString(),
    bpm: 78.5,
    rmssd: 44.1,
    resp_rate: 16.0,
    stress_lvl: 'Moderate',
    tag: 'Evening Winddown'
  }
];

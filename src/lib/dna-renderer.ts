// DNA Fingerprint renderer config
// Visual style for 384-dim embedding visualization

export interface DnaStyle {
  shape: {
    type: 'circles' | 'polygons' | 'lines';
    count: number;
    complexity: number;
  };
  pattern: {
    symmetry: number;
    noise: number;
    lineWeight: number;
  };
  composition: {
    layout: 'radial' | 'grid' | 'spiral';
    centerBias: number;
    rotation: number;
    scale: number;
  };
  palette: {
    mode: 'mono' | 'gradient' | 'multi';
    primary: string;
    secondary: string;
    glow: number;
    opacity: number;
  };
  details: {
    ring: 'none' | 'single' | 'double';
    dots: number;
    crosshatch: number;
  };
}

export const DNA_STYLE: DnaStyle = {
  shape: {
    type: "lines",
    count: 14,
    complexity: 7,
  },
  pattern: {
    symmetry: 8,
    noise: 0.6,
    lineWeight: 4,
  },
  composition: {
    layout: "grid",
    centerBias: 0.2,
    rotation: 0,
    scale: 0.9,
  },
  palette: {
    mode: "gradient",
    primary: "#33cc33",
    secondary: "#00ff88",
    glow: 0.6,
    opacity: 0.7,
  },
  details: {
    ring: "none",
    dots: 0,
    crosshatch: 0.4,
  },
};

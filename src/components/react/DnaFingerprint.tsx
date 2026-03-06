import { useRef, useEffect } from 'react';
import { renderDnaFingerprint } from '../../lib/dna-render-engine';

interface Props {
  embedding: number[];
  size: number;
}

export default function DnaFingerprint({ embedding, size }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !embedding || embedding.length === 0) return;

    renderDnaFingerprint(canvas, embedding, size);
  }, [embedding, size]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      style={{
        width: size,
        height: size,
        display: 'block',
        borderRadius: '4px',
      }}
    />
  );
}

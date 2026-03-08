import { useRef, useEffect, useState } from 'react';
import { renderDnaFingerprint, renderInheritanceOverlay } from '../../lib/dna-render-engine';

interface Props {
  embedding: number[];
  size: number;
  crossoverWeights?: number[];
  parentAEmbedding?: number[];
  parentBEmbedding?: number[];
}

export default function DnaFingerprint({
  embedding,
  size,
  crossoverWeights,
  parentAEmbedding,
  parentBEmbedding,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const [hovering, setHovering] = useState(false);

  const hasInheritance = !!(crossoverWeights && parentAEmbedding && parentBEmbedding);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !embedding || embedding.length === 0) return;
    renderDnaFingerprint(canvas, embedding, size);
  }, [embedding, size]);

  // Inheritance animation on hover
  useEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay || !hasInheritance || !hovering) {
      if (overlayRef.current) {
        const ctx = overlayRef.current.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, size, size);
      }
      if (animRef.current) cancelAnimationFrame(animRef.current);
      return;
    }

    overlay.width = size;
    overlay.height = size;
    let startTime: number | null = null;
    const duration = 2000;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = ((timestamp - startTime) % duration) / duration;
      renderInheritanceOverlay(overlay, size, crossoverWeights!, progress);
      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [hovering, hasInheritance, size, crossoverWeights]);

  return (
    <div
      style={{ position: 'relative', width: size, height: size, display: 'inline-block' }}
      onMouseEnter={() => hasInheritance && setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
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
      {hasInheritance && (
        <canvas
          ref={overlayRef}
          width={size}
          height={size}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: size,
            height: size,
            borderRadius: '4px',
            pointerEvents: 'none',
          }}
        />
      )}
    </div>
  );
}

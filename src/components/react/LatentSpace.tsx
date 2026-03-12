import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useStore } from '@nanostores/react';
import * as d3 from 'd3';
import { $draftIdeas, $buildTimeIdeas, initializeStore } from '../../stores/ideas';
import { projectUMAP } from '../../lib/dimensionality-reduction';
import { dbscan, estimateEps } from '../../lib/clustering';
import { generateEmbedding } from '../../lib/embeddings';

interface IdeaInput {
  id: string;
  title: string;
  status: string;
  tags: string[];
  createdAt: string;
  embedding: number[];
}

interface Props {
  ideas: IdeaInput[];
}

interface ProjectedIdea {
  id: string;
  title: string;
  status: string;
  tags: string[];
  createdAt: string;
  x: number;
  y: number;
  cluster: number;
}

const STATUS_COLORS: Record<string, string> = {
  'idea': '#33cc33',
  'in-progress': '#ffaa00',
  'done': '#00ff88',
  'killed': '#cc3333',
};

const CLUSTER_COLORS = [
  'rgba(0, 255, 136, 0.08)',
  'rgba(51, 204, 51, 0.08)',
  'rgba(255, 170, 0, 0.08)',
  'rgba(0, 170, 255, 0.08)',
  'rgba(204, 51, 255, 0.08)',
  'rgba(255, 85, 85, 0.08)',
  'rgba(255, 255, 0, 0.08)',
  'rgba(0, 255, 255, 0.08)',
];

const STAR_CLUSTER_COLORS = [
  '#00ff88',
  '#33cc33',
  '#ffaa00',
  '#00aaff',
  '#cc33ff',
  '#ff5555',
  '#ffff00',
  '#00ffff',
];

export default function LatentSpace({ ideas: buildTimeIdeas }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [displayMode, setDisplayMode] = useState<'starmap' | 'status'>('starmap');
  const [showTrajectory, setShowTrajectory] = useState(false);
  const [projectedIdeas, setProjectedIdeas] = useState<ProjectedIdea[]>([]);

  const drafts = useStore($draftIdeas);

  // Initialize store
  useEffect(() => {
    initializeStore(buildTimeIdeas as any);
  }, [buildTimeIdeas]);

  // Merge build-time + drafts
  const allIdeas = useMemo(() => {
    const draftMapped = drafts.map(d => ({
      id: d.id,
      title: d.title,
      status: d.status,
      tags: d.tags,
      createdAt: d.createdAt,
      embedding: d.embedding,
    }));
    return [...buildTimeIdeas, ...draftMapped];
  }, [buildTimeIdeas, drafts]);

  // Run projection
  useEffect(() => {
    async function project() {
      if (allIdeas.length < 3) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Ensure all have embeddings
        const withEmbeddings = await Promise.all(
          allIdeas.map(async (idea) => {
            if (idea.embedding && idea.embedding.length === 384) return idea;
            const emb = await generateEmbedding(idea.title);
            return { ...idea, embedding: emb };
          })
        );

        const embeddings = withEmbeddings.map(i => i.embedding);
        const { coordinates } = projectUMAP(embeddings);

        // Cluster
        const eps = estimateEps(coordinates);
        const { labels } = dbscan(coordinates, eps, 2);

        const projected = withEmbeddings.map((idea, i) => ({
          id: idea.id,
          title: idea.title,
          status: idea.status,
          tags: idea.tags,
          createdAt: idea.createdAt,
          x: coordinates[i].x,
          y: coordinates[i].y,
          cluster: labels[i],
        }));

        setProjectedIdeas(projected);
      } catch (e) {
        setError('Failed to compute projection. Try refreshing.');
        console.error(e);
      } finally {
        setLoading(false);
      }
    }

    project();
  }, [allIdeas]);

  // Render with d3
  useEffect(() => {
    if (!svgRef.current || !containerRef.current || projectedIdeas.length === 0) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = Math.max(500, window.innerHeight - 300);

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    svg.attr('width', width).attr('height', height);

    // Scale coordinates to fit
    const xExtent = d3.extent(projectedIdeas, d => d.x) as [number, number];
    const yExtent = d3.extent(projectedIdeas, d => d.y) as [number, number];
    const padding = 60;

    const xScale = d3.scaleLinear().domain(xExtent).range([padding, width - padding]);
    const yScale = d3.scaleLinear().domain(yExtent).range([padding, height - padding]);

    // Main group for zoom
    const g = svg.append('g');

    // Zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 5])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);

    // Defs for gradients and filters
    const defs = svg.append('defs');

    // Glow filter
    if (displayMode === 'starmap') {
      const filter = defs.append('filter').attr('id', 'glow');
      filter.append('feGaussianBlur').attr('stdDeviation', '2').attr('result', 'blur');
      const feMerge = filter.append('feMerge');
      feMerge.append('feMergeNode').attr('in', 'blur');
      feMerge.append('feMergeNode').attr('in', 'SourceGraphic');
    }

    // Draw cluster backgrounds (star map mode)
    if (displayMode === 'starmap') {
      const clusters = new Map<number, ProjectedIdea[]>();
      projectedIdeas.forEach(idea => {
        if (idea.cluster >= 0) {
          if (!clusters.has(idea.cluster)) clusters.set(idea.cluster, []);
          clusters.get(idea.cluster)!.push(idea);
        }
      });

      clusters.forEach((ideas, clusterId) => {
        const cx = d3.mean(ideas, d => xScale(d.x))!;
        const cy = d3.mean(ideas, d => yScale(d.y))!;
        const maxDist = d3.max(ideas, d => {
          const dx = xScale(d.x) - cx;
          const dy = yScale(d.y) - cy;
          return Math.sqrt(dx * dx + dy * dy);
        })! + 40;

        const baseColor = STAR_CLUSTER_COLORS[clusterId % STAR_CLUSTER_COLORS.length];
        const gradId = `cluster-grad-${clusterId}`;
        const grad = defs.append('radialGradient').attr('id', gradId);
        grad.append('stop').attr('offset', '0%').attr('stop-color', baseColor).attr('stop-opacity', 0.12);
        grad.append('stop').attr('offset', '70%').attr('stop-color', baseColor).attr('stop-opacity', 0.04);
        grad.append('stop').attr('offset', '100%').attr('stop-color', baseColor).attr('stop-opacity', 0);

        g.append('circle')
          .attr('cx', cx)
          .attr('cy', cy)
          .attr('r', maxDist)
          .attr('fill', `url(#${gradId})`)
          .attr('class', 'cluster-bg');
      });
    }

    // Draw trajectory line
    if (showTrajectory) {
      const sorted = [...projectedIdeas].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );

      const line = d3.line<ProjectedIdea>()
        .x(d => xScale(d.x))
        .y(d => yScale(d.y))
        .curve(d3.curveCatmullRom);

      const path = g.append('path')
        .datum(sorted)
        .attr('d', line)
        .attr('fill', 'none')
        .attr('stroke', 'rgba(0, 255, 136, 0.2)')
        .attr('stroke-width', 1.5)
        .attr('stroke-dasharray', function() {
          return this.getTotalLength();
        })
        .attr('stroke-dashoffset', function() {
          return this.getTotalLength();
        });

      path.transition()
        .duration(2000)
        .ease(d3.easeLinear)
        .attr('stroke-dashoffset', 0);
    }

    // Tooltip
    const tooltip = d3.select(container)
      .append('div')
      .attr('class', 'latent-tooltip')
      .style('position', 'absolute')
      .style('pointer-events', 'none')
      .style('opacity', 0);

    // Draw points (stars)
    const points = g.selectAll('.idea-point')
      .data(projectedIdeas)
      .enter()
      .append('circle')
      .attr('class', 'idea-point')
      .attr('cx', d => xScale(d.x))
      .attr('cy', d => yScale(d.y))
      .attr('r', d => d.cluster >= 0 ? 5 : 3)
      .attr('fill', d => {
        if (displayMode === 'status') {
          return STATUS_COLORS[d.status] || '#33cc33';
        }
        if (d.cluster >= 0) {
          return STAR_CLUSTER_COLORS[d.cluster % STAR_CLUSTER_COLORS.length];
        }
        return 'rgba(51, 204, 51, 0.4)';
      })
      .attr('stroke', 'none')
      .style('cursor', 'pointer')
      .on('mouseenter', (event, d) => {
        d3.select(event.currentTarget).attr('r', 8);
        tooltip
          .html(`<strong>${d.title}</strong><br/><span style="opacity:0.7">${d.createdAt.split('T')[0]}</span>`)
          .style('left', (event.offsetX + 12) + 'px')
          .style('top', (event.offsetY - 10) + 'px')
          .style('opacity', 1);
      })
      .on('mouseleave', (event, d) => {
        d3.select(event.currentTarget).attr('r', d.cluster >= 0 ? 5 : 3);
        tooltip.style('opacity', 0);
      })
      .on('click', (event, d) => {
        const isDraft = d.id.startsWith('draft-');
        window.location.href = isDraft ? `/draft?id=${d.id}` : `/idea/${d.id}`;
      });

    // Glow effect for stars
    if (displayMode === 'starmap') {
      points.attr('filter', 'url(#glow)');
    }

    // Cleanup
    return () => {
      tooltip.remove();
    };
  }, [projectedIdeas, displayMode, showTrajectory]);

  if (allIdeas.length < 3) {
    return (
      <div className="latent-empty">
        <p>Add more ideas to explore the latent space.</p>
        <p className="latent-empty-hint">At least 3 ideas with embeddings are needed for projection.</p>
      </div>
    );
  }

  return (
    <div className="latent-space-container">
      <div className="latent-controls">
        <div className="control-group">
          <label className="control-label">Display</label>
          <div className="toggle-group">
            <button
              className={`toggle-btn ${displayMode === 'starmap' ? 'active' : ''}`}
              onClick={() => setDisplayMode('starmap')}
            >
              Star Map
            </button>
            <button
              className={`toggle-btn ${displayMode === 'status' ? 'active' : ''}`}
              onClick={() => setDisplayMode('status')}
            >
              Status
            </button>
          </div>
        </div>

        <div className="control-group">
          <label className="control-label">Trajectory</label>
          <button
            className={`toggle-btn ${showTrajectory ? 'active' : ''}`}
            onClick={() => setShowTrajectory(!showTrajectory)}
          >
            {showTrajectory ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>

      {loading && (
        <div className="latent-loading">
          <span className="loading-text">Computing projection...</span>
        </div>
      )}

      {error && (
        <div className="latent-error">{error}</div>
      )}

      <div className="latent-map" ref={containerRef}>
        <svg ref={svgRef} className="latent-svg" />
      </div>

      {displayMode === 'status' && (
        <div className="latent-legend">
          {Object.entries(STATUS_COLORS).map(([status, color]) => (
            <span key={status} className="legend-item">
              <span className="legend-dot" style={{ background: color }} />
              {status}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

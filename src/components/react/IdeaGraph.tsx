import { useRef, useEffect, useState } from 'react';
import type { Idea, Connection } from '../../lib/schemas';
import { loadConnections } from '../../stores/lab';

interface Props {
  ideas: Idea[];
  connections: Connection[];
  buildTimeIds?: string[];
}

interface GraphNode {
  id: string;
  title: string;
  status: string;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
  label: string;
}

const STATUS_COLORS: Record<string, string> = {
  'idea': '#33cc33',
  'in-progress': '#00ff88',
  'done': '#66ff66',
  'killed': '#1a5c2a',
};

export default function IdeaGraph({ ideas, connections, buildTimeIds }: Props) {
  const staticIds = new Set(buildTimeIds || ideas.map((i) => i.id));
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);
  const simulationRef = useRef<any>(null);

  const [breedMode, setBreedMode] = useState(false);
  const [breedParentA, setBreedParentA] = useState<string | null>(null);
  const breedModeRef = useRef(breedMode);
  const breedParentARef = useRef(breedParentA);
  useEffect(() => { breedModeRef.current = breedMode; }, [breedMode]);
  useEffect(() => { breedParentARef.current = breedParentA; }, [breedParentA]);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    let d3Module: typeof import('d3') | null = null;

    const init = async () => {
      const d3 = await import('d3');
      d3Module = d3;

      const width = svg.clientWidth || 800;
      const height = svg.clientHeight || 600;

      // Clear previous
      d3.select(svg).selectAll('*').remove();

      const nodes: GraphNode[] = ideas.map((idea) => ({
        id: idea.id,
        title: idea.title,
        status: idea.status,
      }));

      const nodeIds = new Set(nodes.map((n) => n.id));

      const localConnections = loadConnections();
      const allConnections = [...connections, ...localConnections];

      const links: GraphLink[] = allConnections
        .filter((c) => nodeIds.has(c.sourceId) && nodeIds.has(c.targetId))
        .map((c) => ({
          source: c.sourceId,
          target: c.targetId,
          label: c.label,
        }));

      const simulation = d3
        .forceSimulation(nodes as any)
        .force(
          'link',
          d3
            .forceLink(links as any)
            .id((d: any) => d.id)
            .distance(150),
        )
        .force('charge', d3.forceManyBody().strength(-300))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collision', d3.forceCollide(40));

      simulationRef.current = simulation;

      const svgSelection = d3.select(svg);

      // Background
      svgSelection
        .append('rect')
        .attr('width', width)
        .attr('height', height)
        .attr('fill', '#0a0f0a');

      // Links
      const link = svgSelection
        .append('g')
        .selectAll('line')
        .data(links)
        .enter()
        .append('line')
        .attr('stroke', (d: any) => d.label === 'child-of' ? '#cc33ff' : '#1a3a1a')
        .attr('stroke-width', (d: any) => d.label === 'child-of' ? 1 : 1.5)
        .attr('stroke-dasharray', (d: any) => {
          if (d.label === 'child-of') return '6,3';
          if (d.label === 'related') return '4,4';
          return 'none';
        });

      // Link labels
      const linkLabel = svgSelection
        .append('g')
        .selectAll('text')
        .data(links)
        .enter()
        .append('text')
        .text((d: any) => d.label)
        .attr('fill', (d: any) => d.label === 'child-of' ? '#9933cc' : '#1a5c2a')
        .attr('font-size', '9px')
        .attr('font-family', "'SF Mono', 'Cascadia Code', 'Fira Code', monospace")
        .attr('text-anchor', 'middle');

      // Nodes
      const node = svgSelection
        .append('g')
        .selectAll('g')
        .data(nodes)
        .enter()
        .append('g')
        .style('cursor', 'pointer');

      // Node circles
      node
        .append('circle')
        .attr('r', 16)
        .attr('fill', (d: any) => {
          const color = STATUS_COLORS[d.status] || '#33cc33';
          return color + '33';
        })
        .attr('stroke', (d: any) => STATUS_COLORS[d.status] || '#33cc33')
        .attr('stroke-width', 2);

      // Node inner dot
      node
        .append('circle')
        .attr('r', 4)
        .attr('fill', (d: any) => STATUS_COLORS[d.status] || '#33cc33');

      // Node labels
      node
        .append('text')
        .text((d: any) => d.title.length > 20 ? d.title.slice(0, 20) + '...' : d.title)
        .attr('fill', '#33cc33')
        .attr('font-size', '10px')
        .attr('font-family', "'SF Mono', 'Cascadia Code', 'Fira Code', monospace")
        .attr('text-anchor', 'middle')
        .attr('dy', 30);

      // Interactions
      node
        .on('mouseover', function (event: any, d: any) {
          const [x, y] = d3Module!.pointer(event, svg);
          setTooltip({ x: x + 10, y: y - 10, text: d.title });
          d3Module!.select(this).select('circle').attr('stroke-width', 3);
        })
        .on('mouseout', function () {
          setTooltip(null);
          d3Module!.select(this).select('circle').attr('stroke-width', 2);
        })
        .on('click', (_event: any, d: any) => {
          if (breedModeRef.current) {
            if (!breedParentARef.current) {
              setBreedParentA(d.id);
            } else if (d.id !== breedParentARef.current) {
              window.location.href = `/lab?parentA=${breedParentARef.current}&parentB=${d.id}`;
            }
            return;
          }
          if (staticIds.has(d.id)) {
            window.location.href = `/idea/${d.id}`;
          }
        });

      // Drag
      const drag = d3
        .drag<SVGGElement, GraphNode>()
        .on('start', (event: any, d: any) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on('drag', (event: any, d: any) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on('end', (event: any, d: any) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        });

      node.call(drag as any);

      // Tick
      simulation.on('tick', () => {
        link
          .attr('x1', (d: any) => d.source.x)
          .attr('y1', (d: any) => d.source.y)
          .attr('x2', (d: any) => d.target.x)
          .attr('y2', (d: any) => d.target.y);

        linkLabel
          .attr('x', (d: any) => (d.source.x + d.target.x) / 2)
          .attr('y', (d: any) => (d.source.y + d.target.y) / 2);

        node.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
      });
    };

    init();

    return () => {
      if (simulationRef.current) {
        simulationRef.current.stop();
      }
    };
  }, [ideas, connections]);

  // Highlight breed parent A node when selected
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    import('d3').then((d3) => {
      d3.select(svg)
        .selectAll<SVGGElement, GraphNode>('g > g')
        .select('circle')
        .attr('stroke', (d: any) => {
          if (breedMode && breedParentA === d.id) return '#ffcc00';
          return STATUS_COLORS[d.status] || '#33cc33';
        })
        .attr('stroke-width', (d: any) => {
          if (breedMode && breedParentA === d.id) return 3;
          return 2;
        });
    });
  }, [breedMode, breedParentA]);

  return (
    <div className="graph-container" style={{ position: 'relative' }}>
      <button
        className={`btn btn--sm ${breedMode ? 'btn--primary' : 'btn--ghost'}`}
        onClick={() => { setBreedMode(!breedMode); setBreedParentA(null); }}
        style={{ position: 'absolute', top: 8, right: 8, zIndex: 10 }}
      >
        {breedMode ? (breedParentA ? 'select parent B...' : 'select parent A...') : 'breed mode'}
      </button>
      <svg
        ref={svgRef}
        style={{ width: '100%', height: '100%' }}
      />
      {tooltip && (
        <div
          className="graph-tooltip"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  );
}

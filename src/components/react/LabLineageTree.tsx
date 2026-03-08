import type { LabOffspring, Idea } from '../../lib/schemas';
import DnaFingerprint from './DnaFingerprint';

const BLOCK_LABELS = ['Pal', 'Shp', 'Pat', 'Cmp', 'Rhy', 'Det'];

interface Props {
  offspring: LabOffspring;
  ideasMap: Record<string, Idea>;
  allOffspring: LabOffspring[];
  depth?: number;
}

export default function LabLineageTree({ offspring, ideasMap, allOffspring, depth = 0 }: Props) {
  const parentAIdea = ideasMap[offspring.parentA];
  const parentBIdea = ideasMap[offspring.parentB];
  const parentAOffspring = allOffspring.find((o) => o.id === offspring.parentA);
  const parentBOffspring = allOffspring.find((o) => o.id === offspring.parentB);

  const maxDepth = 4;

  return (
    <div className="lineage-tree" style={{ marginLeft: depth > 0 ? 'var(--spacing-md)' : 0 }}>
      {/* Current node */}
      <div className="lineage-node lineage-node--child">
        <DnaFingerprint embedding={offspring.embedding} size={24} />
        <span className="lineage-node-title">
          {offspring.suggestedTitle || offspring.decodedConcepts.slice(0, 2).join(', ')}
        </span>
        <span className="lineage-node-gen">gen {offspring.generation}</span>
      </div>

      {/* Crossover weight indicator */}
      <div className="lineage-weights">
        {offspring.crossoverWeights.map((w, i) => (
          <div key={i} className="lineage-weight-block">
            <span className="lineage-weight-label">{BLOCK_LABELS[i]}</span>
            <div className="lineage-weight-bar">
              <div className="lineage-weight-fill-a" style={{ width: `${(1 - w) * 100}%` }} />
              <div className="lineage-weight-fill-b" style={{ width: `${w * 100}%` }} />
            </div>
          </div>
        ))}
      </div>

      {/* Parent branches */}
      <div className="lineage-parents">
        <div className="lineage-branch lineage-branch--a">
          <div className="lineage-branch-label">A</div>
          {parentAOffspring && depth < maxDepth ? (
            <LabLineageTree
              offspring={parentAOffspring}
              ideasMap={ideasMap}
              allOffspring={allOffspring}
              depth={depth + 1}
            />
          ) : parentAIdea ? (
            <div className="lineage-node lineage-node--leaf">
              <DnaFingerprint embedding={parentAIdea.embedding} size={24} />
              <span className="lineage-node-title">{parentAIdea.title}</span>
            </div>
          ) : (
            <div className="lineage-node lineage-node--unknown">
              <span className="lineage-node-title">{offspring.parentA}</span>
            </div>
          )}
        </div>

        <div className="lineage-branch lineage-branch--b">
          <div className="lineage-branch-label">B</div>
          {parentBOffspring && depth < maxDepth ? (
            <LabLineageTree
              offspring={parentBOffspring}
              ideasMap={ideasMap}
              allOffspring={allOffspring}
              depth={depth + 1}
            />
          ) : parentBIdea ? (
            <div className="lineage-node lineage-node--leaf">
              <DnaFingerprint embedding={parentBIdea.embedding} size={24} />
              <span className="lineage-node-title">{parentBIdea.title}</span>
            </div>
          ) : (
            <div className="lineage-node lineage-node--unknown">
              <span className="lineage-node-title">{offspring.parentB}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

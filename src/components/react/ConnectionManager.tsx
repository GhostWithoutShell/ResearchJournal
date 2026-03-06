import type { Connection } from '../../lib/schemas';

interface Props {
  connections: Connection[];
  currentIdeaId: string;
  ideaTitles: Record<string, string>;
}

export default function ConnectionManager({ connections, currentIdeaId, ideaTitles }: Props) {
  const relevant = connections.filter(
    (c) => c.sourceId === currentIdeaId || c.targetId === currentIdeaId,
  );

  if (relevant.length === 0) {
    return (
      <p style={{ color: 'var(--color-muted)', fontSize: '0.8125rem', fontStyle: 'italic' }}>
        No connections yet.
      </p>
    );
  }

  return (
    <ul className="connection-list">
      {relevant.map((conn) => {
        const isSource = conn.sourceId === currentIdeaId;
        const linkedId = isSource ? conn.targetId : conn.sourceId;
        const direction = isSource ? '\u2192' : '\u2190';

        return (
          <li key={conn.id} className="connection-item">
            <span className="connection-label">{conn.label}</span>
            <span>{direction}</span>
            <a href={`/idea/${linkedId}`} className="connection-target">
              {ideaTitles[linkedId] || linkedId}
            </a>
          </li>
        );
      })}
    </ul>
  );
}

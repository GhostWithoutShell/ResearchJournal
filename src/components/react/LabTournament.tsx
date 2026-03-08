import { useState, useMemo } from 'react';
import type { LabOffspring, Idea } from '../../lib/schemas';
import { incrementTournamentWins, resetTournament, sortOffspringByTournamentWins } from '../../stores/lab';
import DnaFingerprint from './DnaFingerprint';

interface Props {
  offspring: LabOffspring[];
  ideasMap: Record<string, Idea>;
  onExit: () => void;
}

interface Matchup {
  a: LabOffspring;
  b: LabOffspring;
}

function generateMatchups(offspring: LabOffspring[]): Matchup[] {
  const pairs: Matchup[] = [];
  for (let i = 0; i < offspring.length; i++) {
    for (let j = i + 1; j < offspring.length; j++) {
      pairs.push({ a: offspring[i], b: offspring[j] });
    }
  }
  // Shuffle (Fisher-Yates)
  for (let i = pairs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pairs[i], pairs[j]] = [pairs[j], pairs[i]];
  }
  // Cap at 15 rounds
  return pairs.slice(0, 15);
}

export default function LabTournament({ offspring, ideasMap, onExit }: Props) {
  const [currentRound, setCurrentRound] = useState(0);

  const matchups = useMemo(() => generateMatchups(offspring), [offspring]);

  const totalRounds = matchups.length;
  const finished = currentRound >= totalRounds;

  const handleChoose = (winnerId: string) => {
    incrementTournamentWins(winnerId);
    setCurrentRound((r) => r + 1);
  };

  const handleSkip = () => {
    setCurrentRound((r) => r + 1);
  };

  const handleRestart = () => {
    resetTournament();
    setCurrentRound(0);
  };

  if (finished) {
    const ranked = sortOffspringByTournamentWins();

    return (
      <div className="tournament-container">
        <div className="tournament-header">
          <h3 className="tournament-title">Tournament Results</h3>
        </div>

        <div className="tournament-results">
          {ranked.map((o, i) => {
            const parentA = ideasMap[o.parentA];
            const parentB = ideasMap[o.parentB];
            return (
              <div key={o.id} className={`tournament-result-row ${i === 0 ? 'tournament-winner' : ''}`}>
                <span className="tournament-rank">#{i + 1}</span>
                <DnaFingerprint embedding={o.embedding} size={32} />
                <span className="tournament-result-title">
                  {o.suggestedTitle || o.decodedConcepts.slice(0, 3).join(', ')}
                </span>
                <span className="tournament-wins">{o.tournamentWins ?? 0} wins</span>
              </div>
            );
          })}
        </div>

        <div className="tournament-actions">
          <button className="btn btn--sm btn--primary" onClick={handleRestart}>
            restart tournament
          </button>
          <button className="btn btn--sm btn--ghost" onClick={onExit}>
            back to grid
          </button>
        </div>
      </div>
    );
  }

  const matchup = matchups[currentRound];
  const progressPct = (currentRound / totalRounds) * 100;

  const renderCard = (o: LabOffspring, side: 'left' | 'right') => {
    const parentA = ideasMap[o.parentA];
    const parentB = ideasMap[o.parentB];
    return (
      <div className="tournament-card">
        <div className="tournament-card-dna">
          <DnaFingerprint embedding={o.embedding} size={80} />
        </div>
        <h4 className="tournament-card-title">
          {o.suggestedTitle || o.decodedConcepts.slice(0, 3).join(', ')}
        </h4>
        <div className="tournament-card-concepts">
          {o.decodedConcepts.map((c) => (
            <span key={c} className="tag">{c}</span>
          ))}
        </div>
        {o.fitness && (
          <div className="tournament-card-fitness">
            fitness: {o.fitness.total.toFixed(2)}
          </div>
        )}
        <div className="tournament-card-parents">
          {parentA ? parentA.title : 'unknown'} + {parentB ? parentB.title : 'unknown'}
        </div>
        <button
          className="btn btn--sm btn--primary tournament-choose-btn"
          onClick={() => handleChoose(o.id)}
        >
          choose {side}
        </button>
      </div>
    );
  };

  return (
    <div className="tournament-container">
      <div className="tournament-header">
        <h3 className="tournament-title">Tournament</h3>
        <div className="tournament-progress">
          <div className="tournament-progress-bar">
            <div
              className="tournament-progress-fill"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          round {currentRound + 1} / {totalRounds}
        </div>
      </div>

      <div className="tournament-matchup">
        {renderCard(matchup.a, 'left')}
        <div className="tournament-vs">vs</div>
        {renderCard(matchup.b, 'right')}
      </div>

      <div className="tournament-actions">
        <button className="btn btn--sm btn--ghost" onClick={handleSkip}>
          skip
        </button>
        <button className="btn btn--sm btn--ghost" onClick={onExit}>
          back to grid
        </button>
      </div>
    </div>
  );
}

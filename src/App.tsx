import { parse } from "yaml";

import tournamentConfigSource from "../tournament.config.yml?raw";

type MatchStatus = "finished" | "planned";
type ScoreKey = "first" | "second" | "third";

interface MatchScore {
  first?: string;
  second?: string;
  third?: string;
}

interface MatchConfig {
  status: MatchStatus;
  opponent_1_name?: string;
  opponent_2_name?: string;
  score?: MatchScore;
}

interface TournamentDetails {
  name: string;
  edition: string;
  location: string;
  date: string;
}

interface TournamentConfig {
  tournament: TournamentDetails;
  [key: string]: TournamentDetails | MatchConfig;
}

const config = parse(tournamentConfigSource) as TournamentConfig;
const scoreKeys: ScoreKey[] = ["first", "second", "third"];

function getMatch(matchId: string): MatchConfig {
  return config[matchId] as MatchConfig;
}

function getPlayerName(name?: string) {
  return name?.trim() || "TBA";
}

function parseSetScore(score?: string): [number, number] | null {
  if (!score) return null;

  const [first, second] = score.split("_").map(Number);
  if (!Number.isFinite(first) || !Number.isFinite(second)) return null;

  return [first, second];
}

function getWinner(match: MatchConfig) {
  if (match.status !== "finished") return null;

  const wins = scoreKeys.reduce(
    (total, key) => {
      const setScore = parseSetScore(match.score?.[key]);
      if (!setScore) return total;

      if (setScore[0] > setScore[1]) total[0] += 1;
      if (setScore[1] > setScore[0]) total[1] += 1;
      return total;
    },
    [0, 0],
  );

  if (wins[0] >= 2) return 0;
  if (wins[1] >= 2) return 1;
  return null;
}

function PlayerRow({
  name,
  playerIndex,
  match,
  winner,
}: {
  name: string;
  playerIndex: number;
  match: MatchConfig;
  winner: number | null;
}) {
  const isWinner = winner === playerIndex;
  const isTba = name === "TBA";

  return (
    <div
      className={[
        "player-row",
        isWinner ? "player-row--winner" : "",
        isTba ? "player-row--tba" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <span className="player-name">{name}</span>

      {match.status === "finished" ? (
        <span className="set-scores" aria-label={`${name} set scores`}>
          {scoreKeys.map((key) => {
            const setScore = parseSetScore(match.score?.[key]);
            const value = setScore?.[playerIndex];
            const wonSet =
              setScore !== null &&
              setScore[playerIndex] > setScore[playerIndex === 0 ? 1 : 0];

            return (
              <span
                className={wonSet ? "set-score set-score--won" : "set-score"}
                key={key}
              >
                {value ?? "–"}
              </span>
            );
          })}
        </span>
      ) : (
        <span className="planned-mark" aria-hidden="true">
          —
        </span>
      )}
    </div>
  );
}

function MatchCard({
  matchId,
  featured = false,
}: {
  matchId: string;
  featured?: boolean;
}) {
  const match = getMatch(matchId);
  const firstPlayer = getPlayerName(match.opponent_1_name);
  const secondPlayer = getPlayerName(match.opponent_2_name);
  const winner = getWinner(match);
  const isFinished = match.status === "finished";

  return (
    <article
      className={featured ? "match-card match-card--featured" : "match-card"}
      aria-label={`${matchId}: ${firstPlayer} versus ${secondPlayer}`}
    >
      {isFinished && (
        <div className="set-labels" aria-hidden="true">
          <span>S1</span>
          <span>S2</span>
          <span>S3</span>
        </div>
      )}

      <div className="players">
        <PlayerRow
          name={firstPlayer}
          playerIndex={0}
          match={match}
          winner={winner}
        />
        <PlayerRow
          name={secondPlayer}
          playerIndex={1}
          match={match}
          winner={winner}
        />
      </div>
    </article>
  );
}

function MergeConnector({ direction }: { direction: "left" | "right" }) {
  return (
    <div
      className={`merge-connector merge-connector--${direction}`}
      aria-hidden="true"
    >
      <span className="merge-connector__top" />
      <span className="merge-connector__spine" />
      <span className="merge-connector__bottom" />
      <span className="merge-connector__out" />
    </div>
  );
}

function StraightConnector() {
  return <div className="straight-connector" aria-hidden="true" />;
}

export default function App() {
  return (
    <div className="page-shell">
      <main className="bracket-page">
        <section
          className="bracket-section"
          aria-label="Table tennis championship bracket"
        >
          <div className="bracket-scroll">
            <div className="bracket-board">
              <div className="round-column">
                <h2 className="round-label">Quarterfinals</h2>
                <div className="round-matches round-matches--split">
                  <MatchCard matchId="bracket-8-1" />
                  <MatchCard matchId="bracket-8-2" />
                </div>
              </div>

              <MergeConnector direction="left" />

              <div className="round-column">
                <h2 className="round-label">Semifinals</h2>
                <div className="round-matches round-matches--center">
                  <MatchCard matchId="bracket-4-1" />
                </div>
              </div>

              <StraightConnector />

              <div className="round-column round-column--final">
                <h2 className="round-label round-label--final">Championship</h2>
                <div className="round-matches round-matches--center">
                  <MatchCard matchId="bracket-2-1" featured />
                </div>
              </div>

              <StraightConnector />

              <div className="round-column">
                <h2 className="round-label">Semifinals</h2>
                <div className="round-matches round-matches--center">
                  <MatchCard matchId="bracket-4-2" />
                </div>
              </div>

              <MergeConnector direction="right" />

              <div className="round-column">
                <h2 className="round-label">Quarterfinals</h2>
                <div className="round-matches round-matches--split">
                  <MatchCard matchId="bracket-8-3" />
                  <MatchCard matchId="bracket-8-4" />
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

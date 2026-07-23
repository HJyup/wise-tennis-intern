import { useMemo, useState } from "react";
import { parse } from "yaml";

import tournamentConfigSource from "../tournament.config.yml?raw";

type MatchStatus = "finished" | "planned";
type ScoreKey = "first" | "second" | "third" | "fourth" | "fifth";
type TournamentStage = "round-16" | "quarter" | "semi" | "final";
type MatchId =
  | "bracket-16-1"
  | "bracket-16-2"
  | "bracket-16-3"
  | "bracket-16-4"
  | "bracket-16-5"
  | "bracket-16-6"
  | "bracket-16-7"
  | "bracket-16-8"
  | "bracket-8-1"
  | "bracket-8-2"
  | "bracket-8-3"
  | "bracket-8-4"
  | "bracket-4-1"
  | "bracket-4-2"
  | "bracket-2-1";

interface MatchScore {
  first?: string;
  second?: string;
  third?: string;
  fourth?: string;
  fifth?: string;
}

interface MatchConfig {
  status: MatchStatus;
  date?: string;
  sets?: 1 | 3 | 5;
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
  stage: TournamentStage;
  tournament: TournamentDetails;
  [key: string]: TournamentStage | TournamentDetails | MatchConfig;
}

const config = parse(tournamentConfigSource) as TournamentConfig;
const scoreKeys: ScoreKey[] = ["first", "second", "third", "fourth", "fifth"];
const matchSources: Partial<Record<MatchId, readonly MatchId[]>> = {
  "bracket-8-1": ["bracket-16-1", "bracket-16-2"],
  "bracket-8-2": ["bracket-16-3", "bracket-16-4"],
  "bracket-8-3": ["bracket-16-5", "bracket-16-6"],
  "bracket-8-4": ["bracket-16-7", "bracket-16-8"],
  "bracket-4-1": ["bracket-8-1", "bracket-8-2"],
  "bracket-4-2": ["bracket-8-3", "bracket-8-4"],
  "bracket-2-1": ["bracket-4-1", "bracket-4-2"],
};

function getMatch(matchId: MatchId): MatchConfig {
  return config[matchId] as MatchConfig;
}

function getPlayerName(name?: string) {
  return name?.trim() || "TBA";
}

function normalizePlayerName(name: string) {
  return name.trim().toLocaleLowerCase();
}

function isTbaPlayer(name: string) {
  return normalizePlayerName(name) === "tba";
}

function getKnownPlayers(matchId: MatchId) {
  const match = getMatch(matchId);

  return [match.opponent_1_name, match.opponent_2_name]
    .map(getPlayerName)
    .filter((name) => !isTbaPlayer(name));
}

function getEdgeId(source: MatchId, target: MatchId) {
  return `${source}:${target}`;
}

function getHighlightedPath(activeMatchId: MatchId | null) {
  const matches = new Set<MatchId>();
  const edges = new Set<string>();

  if (!activeMatchId) return { matches, edges };

  const activePlayers = getKnownPlayers(activeMatchId);
  if (activePlayers.length === 0) return { matches, edges };

  matches.add(activeMatchId);

  function tracePlayers(targetMatchId: MatchId, playerNames: Set<string>) {
    const sources = matchSources[targetMatchId] ?? [];

    sources.forEach((sourceMatchId) => {
      const continuingPlayers = getKnownPlayers(sourceMatchId)
        .map(normalizePlayerName)
        .filter((name) => playerNames.has(name));

      if (continuingPlayers.length === 0) return;

      matches.add(sourceMatchId);
      edges.add(getEdgeId(sourceMatchId, targetMatchId));
      tracePlayers(sourceMatchId, new Set(continuingPlayers));
    });
  }

  tracePlayers(activeMatchId, new Set(activePlayers.map(normalizePlayerName)));

  return { matches, edges };
}

function getCurrentStage(stage: unknown): TournamentStage {
  return stage === "round-16" ||
    stage === "quarter" ||
    stage === "semi" ||
    stage === "final"
    ? stage
    : "quarter";
}

function parseSetScore(score?: string): [number, number] | null {
  if (!score) return null;

  const [first, second] = score.split("_").map(Number);
  if (!Number.isFinite(first) || !Number.isFinite(second)) return null;

  return [first, second];
}

function getMatchScoreKeys(match: MatchConfig) {
  return scoreKeys.slice(0, match.sets ?? 3);
}

function getWinner(match: MatchConfig) {
  if (match.status !== "finished") return null;

  const matchScoreKeys = getMatchScoreKeys(match);
  const requiredWins = Math.floor(matchScoreKeys.length / 2) + 1;
  const wins = matchScoreKeys.reduce(
    (total, key) => {
      const setScore = parseSetScore(match.score?.[key]);
      if (!setScore) return total;

      if (setScore[0] > setScore[1]) total[0] += 1;
      if (setScore[1] > setScore[0]) total[1] += 1;
      return total;
    },
    [0, 0],
  );

  if (wins[0] >= requiredWins) return 0;
  if (wins[1] >= requiredWins) return 1;
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
  const isLoser = winner !== null && winner !== playerIndex;
  const isTba = name === "TBA";
  const matchScoreKeys = getMatchScoreKeys(match);
  const scoreClassName = [
    "set-scores",
    matchScoreKeys.length === 1 ? "set-scores--single" : "",
    matchScoreKeys.length === 5 ? "set-scores--five" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={[
        "player-row",
        isLoser ? "player-row--loser" : "",
        isTba ? "player-row--tba" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <span className="player-name">{name}</span>

      {match.status === "finished" ? (
        <span className={scoreClassName} aria-label={`${name} set scores`}>
          {matchScoreKeys.map((key) => {
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
  isPathActive,
  isPathCurrent,
  onPathStart,
  onPathEnd,
}: {
  matchId: MatchId;
  isPathActive: boolean;
  isPathCurrent: boolean;
  onPathStart: (matchId: MatchId) => void;
  onPathEnd: (matchId: MatchId) => void;
}) {
  const match = getMatch(matchId);
  const firstPlayer = getPlayerName(match.opponent_1_name);
  const secondPlayer = getPlayerName(match.opponent_2_name);
  const winner = getWinner(match);
  const isFinished = match.status === "finished";
  const matchScoreKeys = getMatchScoreKeys(match);
  const hasKnownPlayers =
    !isTbaPlayer(firstPlayer) || !isTbaPlayer(secondPlayer);
  const className = [
    "match-card",
    isFinished ? "" : "match-card--planned",
    hasKnownPlayers ? "match-card--interactive" : "",
    isPathActive ? "match-card--path-active" : "",
    isPathCurrent ? "match-card--path-current" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <article
      className={className}
      aria-label={`${matchId}: ${firstPlayer} versus ${secondPlayer}`}
      onBlur={() => onPathEnd(matchId)}
      onFocus={() => hasKnownPlayers && onPathStart(matchId)}
      onPointerEnter={() => hasKnownPlayers && onPathStart(matchId)}
      onPointerLeave={() => onPathEnd(matchId)}
      tabIndex={hasKnownPlayers ? 0 : undefined}
    >
      <div className="match-table">
        <div className="score-heading">
          <span className="match-date">{match.date ?? "Date TBA"}</span>
          <span
            className={[
              "set-labels",
              matchScoreKeys.length === 1 ? "set-labels--single" : "",
              matchScoreKeys.length === 5 ? "set-labels--five" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            aria-hidden="true"
          >
            {matchScoreKeys.map((key, index) => (
              <span key={key}>S{index + 1}</span>
            ))}
          </span>
        </div>

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
      </div>
    </article>
  );
}

function getConnectorClass(className: string, isActive: boolean) {
  return isActive
    ? `${className} connector-path--active`
    : `${className} connector-path`;
}

function MergeConnector({
  direction,
  isTopActive,
  isBottomActive,
}: {
  direction: "left" | "right";
  isTopActive: boolean;
  isBottomActive: boolean;
}) {
  const isOutputActive = isTopActive || isBottomActive;

  return (
    <div
      className={`merge-connector merge-connector--${direction}`}
      aria-hidden="true"
    >
      <span
        className={getConnectorClass("merge-connector__top", isTopActive)}
      />
      <span
        className={getConnectorClass(
          "merge-connector__spine merge-connector__spine--top",
          isTopActive,
        )}
      />
      <span
        className={getConnectorClass(
          "merge-connector__spine merge-connector__spine--bottom",
          isBottomActive,
        )}
      />
      <span
        className={getConnectorClass("merge-connector__bottom", isBottomActive)}
      />
      <span
        className={getConnectorClass("merge-connector__out", isOutputActive)}
      />
    </div>
  );
}

function DoubleMergeConnector({
  direction,
  activeBranches,
}: {
  direction: "left" | "right";
  activeBranches: readonly [boolean, boolean, boolean, boolean];
}) {
  const firstOutputActive = activeBranches[0] || activeBranches[1];
  const secondOutputActive = activeBranches[2] || activeBranches[3];

  return (
    <div
      className={`double-merge-connector double-merge-connector--${direction}`}
      aria-hidden="true"
    >
      {activeBranches.map((isActive, index) => (
        <span
          className={getConnectorClass(
            `double-merge-connector__branch double-merge-connector__branch--${index + 1}`,
            isActive,
          )}
          key={`branch-${index + 1}`}
        />
      ))}
      <span
        className={getConnectorClass(
          "double-merge-connector__spine double-merge-connector__spine--first-top",
          activeBranches[0],
        )}
      />
      <span
        className={getConnectorClass(
          "double-merge-connector__spine double-merge-connector__spine--first-bottom",
          activeBranches[1],
        )}
      />
      <span
        className={getConnectorClass(
          "double-merge-connector__spine double-merge-connector__spine--second-top",
          activeBranches[2],
        )}
      />
      <span
        className={getConnectorClass(
          "double-merge-connector__spine double-merge-connector__spine--second-bottom",
          activeBranches[3],
        )}
      />
      <span
        className={getConnectorClass(
          "double-merge-connector__out double-merge-connector__out--first",
          firstOutputActive,
        )}
      />
      <span
        className={getConnectorClass(
          "double-merge-connector__out double-merge-connector__out--second",
          secondOutputActive,
        )}
      />
    </div>
  );
}

function StraightConnector({ isActive }: { isActive: boolean }) {
  return (
    <div className="straight-connector" aria-hidden="true">
      <span
        className={getConnectorClass("straight-connector__line", isActive)}
      />
    </div>
  );
}

export default function App() {
  const currentStage = getCurrentStage(config.stage);
  const [activeMatchId, setActiveMatchId] = useState<MatchId | null>(null);
  const highlightedPath = useMemo(
    () => getHighlightedPath(activeMatchId),
    [activeMatchId],
  );

  function renderMatchCard(matchId: MatchId) {
    return (
      <MatchCard
        isPathActive={highlightedPath.matches.has(matchId)}
        isPathCurrent={activeMatchId === matchId}
        matchId={matchId}
        onPathEnd={(endingMatchId) =>
          setActiveMatchId((currentMatchId) =>
            currentMatchId === endingMatchId ? null : currentMatchId,
          )
        }
        onPathStart={setActiveMatchId}
      />
    );
  }

  return (
    <div className="page-shell">
      <main className="bracket-page">
        <section
          className="bracket-section bracket-section--main"
          aria-label="Table tennis championship bracket"
        >
          <div className="bracket-scroll">
            <div className="bracket-board">
              <div
                className={
                  currentStage === "round-16"
                    ? "round-column round-column--current"
                    : "round-column"
                }
                aria-current={currentStage === "round-16" ? "step" : undefined}
              >
                <h2 className="round-label">Round of 16</h2>
                <div className="round-matches round-matches--four">
                  {renderMatchCard("bracket-16-1")}
                  {renderMatchCard("bracket-16-2")}
                  {renderMatchCard("bracket-16-3")}
                  {renderMatchCard("bracket-16-4")}
                </div>
              </div>

              <DoubleMergeConnector
                activeBranches={[
                  highlightedPath.edges.has(
                    getEdgeId("bracket-16-1", "bracket-8-1"),
                  ),
                  highlightedPath.edges.has(
                    getEdgeId("bracket-16-2", "bracket-8-1"),
                  ),
                  highlightedPath.edges.has(
                    getEdgeId("bracket-16-3", "bracket-8-2"),
                  ),
                  highlightedPath.edges.has(
                    getEdgeId("bracket-16-4", "bracket-8-2"),
                  ),
                ]}
                direction="left"
              />

              <div
                className={
                  currentStage === "quarter"
                    ? "round-column round-column--current"
                    : "round-column"
                }
                aria-current={currentStage === "quarter" ? "step" : undefined}
              >
                <h2 className="round-label">Quarterfinals</h2>
                <div className="round-matches round-matches--split">
                  {renderMatchCard("bracket-8-1")}
                  {renderMatchCard("bracket-8-2")}
                </div>
              </div>

              <MergeConnector
                direction="left"
                isBottomActive={highlightedPath.edges.has(
                  getEdgeId("bracket-8-2", "bracket-4-1"),
                )}
                isTopActive={highlightedPath.edges.has(
                  getEdgeId("bracket-8-1", "bracket-4-1"),
                )}
              />

              <div
                className={
                  currentStage === "semi"
                    ? "round-column round-column--current"
                    : "round-column"
                }
                aria-current={currentStage === "semi" ? "step" : undefined}
              >
                <h2 className="round-label">Semifinals</h2>
                <div className="round-matches round-matches--center">
                  {renderMatchCard("bracket-4-1")}
                </div>
              </div>

              <StraightConnector
                isActive={highlightedPath.edges.has(
                  getEdgeId("bracket-4-1", "bracket-2-1"),
                )}
              />

              <div
                className={
                  currentStage === "final"
                    ? "round-column round-column--current"
                    : "round-column"
                }
                aria-current={currentStage === "final" ? "step" : undefined}
              >
                <h2 className="round-label">Championship</h2>
                <div className="round-matches round-matches--center">
                  {renderMatchCard("bracket-2-1")}
                </div>
              </div>

              <StraightConnector
                isActive={highlightedPath.edges.has(
                  getEdgeId("bracket-4-2", "bracket-2-1"),
                )}
              />

              <div
                className={
                  currentStage === "semi"
                    ? "round-column round-column--current"
                    : "round-column"
                }
                aria-current={currentStage === "semi" ? "step" : undefined}
              >
                <h2 className="round-label">Semifinals</h2>
                <div className="round-matches round-matches--center">
                  {renderMatchCard("bracket-4-2")}
                </div>
              </div>

              <MergeConnector
                direction="right"
                isBottomActive={highlightedPath.edges.has(
                  getEdgeId("bracket-8-4", "bracket-4-2"),
                )}
                isTopActive={highlightedPath.edges.has(
                  getEdgeId("bracket-8-3", "bracket-4-2"),
                )}
              />

              <div
                className={
                  currentStage === "quarter"
                    ? "round-column round-column--current"
                    : "round-column"
                }
                aria-current={currentStage === "quarter" ? "step" : undefined}
              >
                <h2 className="round-label">Quarterfinals</h2>
                <div className="round-matches round-matches--split">
                  {renderMatchCard("bracket-8-3")}
                  {renderMatchCard("bracket-8-4")}
                </div>
              </div>

              <DoubleMergeConnector
                activeBranches={[
                  highlightedPath.edges.has(
                    getEdgeId("bracket-16-5", "bracket-8-3"),
                  ),
                  highlightedPath.edges.has(
                    getEdgeId("bracket-16-6", "bracket-8-3"),
                  ),
                  highlightedPath.edges.has(
                    getEdgeId("bracket-16-7", "bracket-8-4"),
                  ),
                  highlightedPath.edges.has(
                    getEdgeId("bracket-16-8", "bracket-8-4"),
                  ),
                ]}
                direction="right"
              />

              <div
                className={
                  currentStage === "round-16"
                    ? "round-column round-column--current"
                    : "round-column"
                }
                aria-current={currentStage === "round-16" ? "step" : undefined}
              >
                <h2 className="round-label">Round of 16</h2>
                <div className="round-matches round-matches--four">
                  {renderMatchCard("bracket-16-5")}
                  {renderMatchCard("bracket-16-6")}
                  {renderMatchCard("bracket-16-7")}
                  {renderMatchCard("bracket-16-8")}
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

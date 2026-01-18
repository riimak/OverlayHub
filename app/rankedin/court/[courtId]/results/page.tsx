"use client";

import { useEffect, useState } from "react";

type TournamentMatch = {
  Id: number;
  Date: string;
  Court: string;
  Challenger?: {
    Name?: string;
    CountryShort?: string;
  };
  Challenged?: {
    Name?: string;
    CountryShort?: string;
  };
  State?: number;
  MatchResult?: {
    Score?: {
      FirstParticipantScore: number;
      SecondParticipantScore: number;
      DetailedScoring?: Array<{
        FirstParticipantScore: number;
        SecondParticipantScore: number;
        IsFirstParticipantWinner: boolean;
      }>;
      IsFirstParticipantWinner: boolean;
    };
    TotalDurationInMinutes?: number | null;
    IsPlayed?: boolean;
  };
};

function courtIdFromPathname(pathname: string) {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length >= 4 && parts[0] === "rankedin" && parts[1] === "court") {
    return parts[2] || "";
  }
  return "";
}

export default function ResultsPage() {
  const [courtId, setCourtId] = useState<string>("");
  const [matches, setMatches] = useState<TournamentMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const MATCHES_PER_PAGE = 12;

  useEffect(() => {
    const id = courtIdFromPathname(window.location.pathname);
    setCourtId(id);
  }, []);

  useEffect(() => {
    if (!courtId) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError("");

        // Fetch settings to get tournament info
        const settingsRes = await fetch(`/api/rankedin/court/${courtId}/settings`, {
          cache: "no-store",
        });
        
        if (!settingsRes.ok) {
          throw new Error("Failed to load settings");
        }

        const settings = await settingsRes.json();
        const tournamentId = settings.tournamentId;
        const tournamentLang = settings.tournamentLang || "en";
        const tournamentCourtName = settings.tournamentCourtName || "";

        if (!tournamentId) {
          setError("No tournament configured");
          setLoading(false);
          return;
        }

        // Fetch tournament matches via our API
        const url = `/api/rankedin/tournament/${encodeURIComponent(tournamentId)}/matches?lang=${encodeURIComponent(tournamentLang)}&readonly=true`;
        const matchesRes = await fetch(url, { cache: "no-store" });

        if (!matchesRes.ok) {
          throw new Error("Failed to load matches");
        }

        const data = await matchesRes.json();
        const allMatches = (data.Matches || []) as TournamentMatch[];

        // Filter for this court and completed matches only (State 6 = completed)
        const courtMatches = allMatches.filter((m) => {
          const matchCourt = String(m?.Court ?? "");
          const isThisCourt = tournamentCourtName ? matchCourt === tournamentCourtName : true;
          const isCompleted = m?.State === 6 && m?.MatchResult?.IsPlayed;
          return isThisCourt && isCompleted;
        });

        // Sort by date
        courtMatches.sort((a, b) => String(a?.Date ?? "").localeCompare(String(b?.Date ?? "")));

        setMatches(courtMatches);
        setLoading(false);
      } catch (err: any) {
        setError(err.message || "Failed to load data");
        setLoading(false);
      }
    };

    fetchData();
  }, [courtId]);

  // Auto-rotate carousel
  useEffect(() => {
    if (matches.length === 0) return;

    const totalPages = Math.ceil(matches.length / MATCHES_PER_PAGE);
    if (totalPages <= 1) return;

    const interval = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentPage((prev) => {
          const next = prev + 1;
          return next >= totalPages ? 0 : next;
        });
        setIsTransitioning(false);
      }, 300); // Match CSS transition duration
    }, 10000); // Rotate every 10 seconds

    return () => clearInterval(interval);
  }, [matches.length, MATCHES_PER_PAGE]);

  const formatTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
    } catch {
      return "";
    }
  };

  if (loading) {
    return (
      <div style={{
        minHeight: "100vh",
        background: "rgba(30, 41, 59, 0.95)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#f1f5f9",
        fontSize: 24,
        fontFamily: "Inter, -apple-system, sans-serif"
      }}>
        Loading results...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        minHeight: "100vh",
        background: "rgba(30, 41, 59, 0.95)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#ef4444",
        fontSize: 20,
        fontFamily: "Inter, -apple-system, sans-serif",
        padding: 32
      }}>
        {error}
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "rgba(30, 41, 59, 0.95)",
      padding: "32px 24px",
      fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    }}>
      <style>{`
        :root{
          /* Squasher.hr dark theme */
          --bg: rgba(30, 41, 59, 0.95);
          --ink: rgba(255, 255, 255, 0.95);
          --line: rgba(100, 116, 139, 0.3);

          /* Primary accent - mint green */
          --accent: #ACEF34;
          --accentDark: #8BC428;

          /* Blue accent */
          --blue: #7DC1FF;

          /* Shadow */
          --shadow: 0 12px 26px rgba(0,0,0,0.5);
        }

        .card {
          background: var(--bg);
          border: 1px solid var(--line);
          border-radius: 3px;
          padding: 12px;
          box-shadow: var(--shadow);
          color: var(--ink);
        }

        .matchHeader {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
          padding-bottom: 6px;
          border-bottom: 1px solid var(--line);
        }

        .matchTime {
          font-size: 11px;
          color: #94a3b8;
          font-weight: 600;
        }

        .matchDuration {
          font-size: 10px;
          color: #64748b;
        }

        .players {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .playerRow {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 8px;
          align-items: center;
        }

        .playerName {
          font-size: 14px;
          font-weight: 600;
          color: var(--ink);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .playerName.winner {
          color: var(--accent);
        }

        .matchScore {
          font-size: 20px;
          font-weight: 800;
          color: #94a3b8;
          min-width: 30px;
          text-align: center;
        }

        .matchScore.winner {
          color: var(--accent);
        }

        .detailedScores {
          display: flex;
          gap: 4px;
          margin-top: 6px;
          flex-wrap: wrap;
        }

        .gameChip {
          background: rgba(100, 116, 139, 0.2);
          border: 1px solid var(--line);
          padding: 2px 6px;
          border-radius: 3px;
          font-size: 11px;
          font-weight: 600;
          color: #cbd5e1;
        }

        .resultsGrid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 12px;
          opacity: 1;
          transition: opacity 0.3s ease-in-out;
        }

        .resultsGrid.fade {
          opacity: 0;
        }

        .carousel {
          position: relative;
          overflow: hidden;
        }

        .pagination {
          display: flex;
          justify-content: center;
          gap: 8px;
          margin-top: 20px;
        }

        .paginationDot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: rgba(100, 116, 139, 0.4);
          cursor: pointer;
          transition: all 0.3s;
        }

        .paginationDot.active {
          background: var(--accent);
          width: 24px;
          border-radius: 4px;
        }

        .paginationDot:hover {
          background: rgba(172, 239, 52, 0.6);
        }
      `}</style>

      <div style={{ maxWidth: 1400, margin: "0 auto" }}>
        <div style={{
          marginBottom: 24,
          textAlign: "center"
        }}>
          <h1 style={{
            fontSize: 36,
            fontWeight: 800,
            margin: 0,
            marginBottom: 6,
            background: "linear-gradient(135deg, #ACEF34 0%, #7DC1FF 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text"
          }}>
            Match Results
          </h1>
          <p style={{
            fontSize: 14,
            color: "#94a3b8",
            margin: 0
          }}>
            {matches.length} completed {matches.length === 1 ? "match" : "matches"}
          </p>
        </div>

        {matches.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: 40 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🏆</div>
            <div style={{ fontSize: 20, color: "#94a3b8" }}>
              No completed matches yet
            </div>
          </div>
        ) : (
          <>
            <div className="carousel">
              <div className={`resultsGrid ${isTransitioning ? 'fade' : ''}`}>
                {matches
                  .slice(currentPage * MATCHES_PER_PAGE, (currentPage + 1) * MATCHES_PER_PAGE)
                  .map((match) => {
            const result = match.MatchResult;
            const score = result?.Score;
            const challenger = match.Challenger?.Name || "Player 1";
            const challenged = match.Challenged?.Name || "Player 2";
            const isFirstWinner = score?.IsFirstParticipantWinner ?? false;
            const detailedScores = score?.DetailedScoring || [];
            const duration = result?.TotalDurationInMinutes;

            return (
              <div key={match.Id} className="card">
                <div className="matchHeader">
                  <div className="matchTime">
                    {formatTime(match.Date)}
                  </div>
                  {duration && (
                    <div className="matchDuration">
                      {duration} min
                    </div>
                  )}
                </div>

                <div className="players">
                  <div className="playerRow">
                    <div className={`playerName ${isFirstWinner ? "winner" : ""}`}>
                      {challenger}
                    </div>
                    <div className={`matchScore ${isFirstWinner ? "winner" : ""}`}>
                      {score?.FirstParticipantScore ?? 0}
                    </div>
                  </div>

                  <div className="playerRow">
                    <div className={`playerName ${!isFirstWinner ? "winner" : ""}`}>
                      {challenged}
                    </div>
                    <div className={`matchScore ${!isFirstWinner ? "winner" : ""}`}>
                      {score?.SecondParticipantScore ?? 0}
                    </div>
                  </div>
                </div>

                {detailedScores.length > 0 && (
                  <div className="detailedScores">
                    {detailedScores.map((game, idx) => (
                      <div key={idx} className="gameChip">
                        {game.FirstParticipantScore}-{game.SecondParticipantScore}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
              </div>
            </div>

            {Math.ceil(matches.length / MATCHES_PER_PAGE) > 1 && (
              <div className="pagination">
                {Array.from({ length: Math.ceil(matches.length / MATCHES_PER_PAGE) }).map((_, idx) => (
                  <div
                    key={idx}
                    className={`paginationDot ${currentPage === idx ? "active" : ""}`}
                    onClick={() => {
                      if (idx !== currentPage) {
                        setIsTransitioning(true);
                        setTimeout(() => {
                          setCurrentPage(idx);
                          setIsTransitioning(false);
                        }, 300);
                      }
                    }}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState, useCallback } from "react";
import {
  placeBet,
  getBet,
  declareWinner,
  claimReward,
  CONTRACT_ADDRESS,
} from "@/hooks/contract";
import { AnimatedCard } from "@/components/ui/animated-card";
import { Spotlight } from "@/components/ui/spotlight";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ── Icons ────────────────────────────────────────────────────

function SpinnerIcon() {
  return (
    <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

function BetIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" />
      <path d="M15 18H9" />
      <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14" />
      <circle cx="17" cy="18" r="2" />
      <circle cx="7" cy="18" r="2" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function TrophyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  );
}

function GiftIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="8" width="18" height="4" rx="1" />
      <path d="M12 8v13" />
      <path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7" />
      <path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

// ── Styled Input ─────────────────────────────────────────────

function Input({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-2">
      <label className="block text-[11px] font-medium uppercase tracking-wider text-white/30">
        {label}
      </label>
      <div className="group rounded-xl border border-white/[0.06] bg-white/[0.02] p-px transition-all focus-within:border-[#7c6cf0]/30 focus-within:shadow-[0_0_20px_rgba(124,108,240,0.08)]">
        <input
          {...props}
          className="w-full rounded-[11px] bg-transparent px-4 py-3 font-mono text-sm text-white/90 placeholder:text-white/15 outline-none"
        />
      </div>
    </div>
  );
}

// ── Method Signature ─────────────────────────────────────────

function MethodSignature({
  name,
  params,
  returns,
  color,
}: {
  name: string;
  params: string;
  returns?: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-white/[0.04] bg-white/[0.02] px-4 py-3 font-mono text-sm">
      <span style={{ color }} className="font-semibold">fn</span>
      <span className="text-white/70">{name}</span>
      <span className="text-white/20 text-xs">{params}</span>
      {returns && (
        <span className="ml-auto text-white/15 text-[10px]">{returns}</span>
      )}
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────

type Tab = "bet" | "view" | "admin" | "claim";

interface ContractUIProps {
  walletAddress: string | null;
  onConnect: () => void;
  isConnecting: boolean;
}

export default function ContractUI({ walletAddress, onConnect, isConnecting }: ContractUIProps) {
  const [activeTab, setActiveTab] = useState<Tab>("bet");
  const [error, setError] = useState<string | null>(null);
  const [txStatus, setTxStatus] = useState<string | null>(null);

  // Place Bet
  const [matchId, setMatchId] = useState("");
  const [team, setTeam] = useState("");
  const [amount, setAmount] = useState("");
  const [isPlacingBet, setIsPlacingBet] = useState(false);

  // View Bet
  const [viewMatchId, setViewMatchId] = useState("");
  const [isViewing, setIsViewing] = useState(false);
  const [betData, setBetData] = useState<{ team: string; amount: string } | null>(null);

  // Declare Winner
  const [adminMatchId, setAdminMatchId] = useState("");
  const [winnerTeam, setWinnerTeam] = useState("");
  const [isDeclaring, setIsDeclaring] = useState(false);

  // Claim Reward
  const [claimMatchId, setClaimMatchId] = useState("");
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimResult, setClaimResult] = useState<boolean | null>(null);

  const truncate = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  const handlePlaceBet = useCallback(async () => {
    if (!walletAddress) return setError("Connect wallet first");
    if (!matchId.trim() || !team.trim() || !amount.trim()) return setError("Fill in all fields");
    const matchIdNum = parseInt(matchId.trim(), 10);
    const amountNum = BigInt(amount.trim());
    if (isNaN(matchIdNum) || amountNum <= 0n) return setError("Invalid match ID or amount");
    setError(null);
    setIsPlacingBet(true);
    setTxStatus("Awaiting signature...");
    try {
      await placeBet(walletAddress, matchIdNum, team.trim().toUpperCase(), amountNum);
      setTxStatus("Bet placed successfully!");
      setMatchId("");
      setTeam("");
      setAmount("");
      setTimeout(() => setTxStatus(null), 5000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Transaction failed");
      setTxStatus(null);
    } finally {
      setIsPlacingBet(false);
    }
  }, [walletAddress, matchId, team, amount]);

  const handleViewBet = useCallback(async () => {
    if (!viewMatchId.trim()) return setError("Enter a match ID");
    const matchIdNum = parseInt(viewMatchId.trim(), 10);
    if (isNaN(matchIdNum)) return setError("Invalid match ID");
    setError(null);
    setIsViewing(true);
    setBetData(null);
    try {
      const result = await getBet(matchIdNum, walletAddress || undefined);
      if (result && Array.isArray(result) && result.length === 2) {
        setBetData({ team: String(result[0]), amount: String(result[1]) });
      } else {
        setError("No bet found for this match");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Query failed");
    } finally {
      setIsViewing(false);
    }
  }, [viewMatchId, walletAddress]);

  const handleDeclareWinner = useCallback(async () => {
    if (!walletAddress) return setError("Connect wallet first");
    if (!adminMatchId.trim() || !winnerTeam.trim()) return setError("Fill in all fields");
    const matchIdNum = parseInt(adminMatchId.trim(), 10);
    if (isNaN(matchIdNum)) return setError("Invalid match ID");
    setError(null);
    setIsDeclaring(true);
    setTxStatus("Awaiting signature...");
    try {
      await declareWinner(walletAddress, matchIdNum, winnerTeam.trim().toUpperCase());
      setTxStatus("Winner declared successfully!");
      setAdminMatchId("");
      setWinnerTeam("");
      setTimeout(() => setTxStatus(null), 5000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Transaction failed");
      setTxStatus(null);
    } finally {
      setIsDeclaring(false);
    }
  }, [walletAddress, adminMatchId, winnerTeam]);

  const handleClaimReward = useCallback(async () => {
    if (!walletAddress) return setError("Connect wallet first");
    if (!claimMatchId.trim()) return setError("Enter a match ID");
    const matchIdNum = parseInt(claimMatchId.trim(), 10);
    if (isNaN(matchIdNum)) return setError("Invalid match ID");
    setError(null);
    setIsClaiming(true);
    setTxStatus("Awaiting signature...");
    setClaimResult(null);
    try {
      const result = await claimReward(walletAddress, matchIdNum);
      // The result comes from getTransaction - need to parse it
      setClaimResult(true);
      setTxStatus("Reward claimed successfully!");
      setClaimMatchId("");
      setTimeout(() => setTxStatus(null), 5000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Transaction failed - you may not have won");
      setTxStatus(null);
    } finally {
      setIsClaiming(false);
    }
  }, [walletAddress, claimMatchId]);

  const tabs: { key: Tab; label: string; icon: React.ReactNode; color: string }[] = [
    { key: "bet", label: "Place Bet", icon: <BetIcon />, color: "#7c6cf0" },
    { key: "view", label: "My Bets", icon: <SearchIcon />, color: "#4fc3f7" },
    { key: "admin", label: "Declare Winner", icon: <TrophyIcon />, color: "#fbbf24" },
    { key: "claim", label: "Claim", icon: <GiftIcon />, color: "#34d399" },
  ];

  return (
    <div className="w-full max-w-2xl animate-fade-in-up-delayed">
      {/* Toasts */}
      {error && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-[#f87171]/15 bg-[#f87171]/[0.05] px-4 py-3 backdrop-blur-sm animate-slide-down">
          <span className="mt-0.5 text-[#f87171]"><AlertIcon /></span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-[#f87171]/90">Error</p>
            <p className="text-xs text-[#f87171]/50 mt-0.5 break-all">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="shrink-0 text-[#f87171]/30 hover:text-[#f87171]/70 text-lg leading-none">&times;</button>
        </div>
      )}

      {txStatus && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-[#34d399]/15 bg-[#34d399]/[0.05] px-4 py-3 backdrop-blur-sm shadow-[0_0_30px_rgba(52,211,153,0.05)] animate-slide-down">
          <span className="text-[#34d399]">
            {txStatus.includes("success") || txStatus.includes("declared") || txStatus.includes("claimed") ? <CheckIcon /> : <SpinnerIcon />}
          </span>
          <span className="text-sm text-[#34d399]/90">{txStatus}</span>
        </div>
      )}

      {/* Main Card */}
      <Spotlight className="rounded-2xl">
        <AnimatedCard className="p-0" containerClassName="rounded-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#7c6cf0]/20 to-[#4fc3f7]/20 border border-white/[0.06]">
                <TrophyIcon />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white/90">Sports Betting</h3>
                <p className="text-[10px] text-white/25 font-mono mt-0.5">{truncate(CONTRACT_ADDRESS)}</p>
              </div>
            </div>
            <Badge variant="info" className="text-[10px]">Soroban</Badge>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-white/[0.06] px-2 overflow-x-auto">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => { setActiveTab(t.key); setError(null); setBetData(null); setClaimResult(null); }}
                className={cn(
                  "relative flex items-center gap-2 px-4 py-3.5 text-sm font-medium transition-all whitespace-nowrap",
                  activeTab === t.key ? "text-white/90" : "text-white/35 hover:text-white/55"
                )}
              >
                <span style={activeTab === t.key ? { color: t.color } : undefined}>{t.icon}</span>
                {t.label}
                {activeTab === t.key && (
                  <span
                    className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full transition-all"
                    style={{ background: `linear-gradient(to right, ${t.color}, ${t.color}66)` }}
                  />
                )}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {/* Place Bet */}
            {activeTab === "bet" && (
              <div className="space-y-5">
                <MethodSignature name="place_bet" params="(user, match_id, team, amount)" color="#7c6cf0" />
                <Input label="Match ID" value={matchId} onChange={(e) => setMatchId(e.target.value)} placeholder="e.g. 1" type="number" />
                <Input label="Team (Symbol)" value={team} onChange={(e) => setTeam(e.target.value)} placeholder="e.g. TEAM_A" />
                <Input label="Amount (XLM)" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 100" type="number" />
                {walletAddress ? (
                  <ShimmerButton onClick={handlePlaceBet} disabled={isPlacingBet} shimmerColor="#7c6cf0" className="w-full">
                    {isPlacingBet ? <><SpinnerIcon /> Placing Bet...</> : <><BetIcon /> Place Bet</>}
                  </ShimmerButton>
                ) : (
                  <button
                    onClick={onConnect}
                    disabled={isConnecting}
                    className="w-full rounded-xl border border-dashed border-[#7c6cf0]/20 bg-[#7c6cf0]/[0.03] py-4 text-sm text-[#7c6cf0]/60 hover:border-[#7c6cf0]/30 hover:text-[#7c6cf0]/80 active:scale-[0.99] transition-all disabled:opacity-50"
                  >
                    Connect wallet to place a bet
                  </button>
                )}
              </div>
            )}

            {/* View Bet */}
            {activeTab === "view" && (
              <div className="space-y-5">
                <MethodSignature name="get_bet" params="(user, match_id)" returns="-> (team, amount)" color="#4fc3f7" />
                <Input label="Match ID" value={viewMatchId} onChange={(e) => setViewMatchId(e.target.value)} placeholder="e.g. 1" type="number" />
                <ShimmerButton onClick={handleViewBet} disabled={isViewing} shimmerColor="#4fc3f7" className="w-full">
                  {isViewing ? <><SpinnerIcon /> Fetching...</> : <><SearchIcon /> View My Bet</>}
                </ShimmerButton>

                {betData && (
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden animate-fade-in-up">
                    <div className="border-b border-white/[0.06] px-4 py-3 flex items-center justify-between">
                      <span className="text-[10px] font-medium uppercase tracking-wider text-white/25">Your Bet</span>
                      <Badge variant="info">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#4fc3f7]" />
                        Active
                      </Badge>
                    </div>
                    <div className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-white/35">Team</span>
                        <span className="font-mono text-sm text-white/80">{betData.team}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-white/35">Amount</span>
                        <span className="font-mono text-sm text-white/80">{betData.amount} XLM</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Declare Winner */}
            {activeTab === "admin" && (
              <div className="space-y-5">
                <MethodSignature name="declare_winner" params="(match_id, winning_team)" color="#fbbf24" />
                <Input label="Match ID" value={adminMatchId} onChange={(e) => setAdminMatchId(e.target.value)} placeholder="e.g. 1" type="number" />
                <Input label="Winning Team (Symbol)" value={winnerTeam} onChange={(e) => setWinnerTeam(e.target.value)} placeholder="e.g. TEAM_A" />
                {walletAddress ? (
                  <ShimmerButton onClick={handleDeclareWinner} disabled={isDeclaring} shimmerColor="#fbbf24" className="w-full">
                    {isDeclaring ? <><SpinnerIcon /> Declaring...</> : <><TrophyIcon /> Declare Winner</>}
                  </ShimmerButton>
                ) : (
                  <button
                    onClick={onConnect}
                    disabled={isConnecting}
                    className="w-full rounded-xl border border-dashed border-[#fbbf24]/20 bg-[#fbbf24]/[0.03] py-4 text-sm text-[#fbbf24]/60 hover:border-[#fbbf24]/30 hover:text-[#fbbf24]/80 active:scale-[0.99] transition-all disabled:opacity-50"
                  >
                    Connect wallet to declare winner
                  </button>
                )}
              </div>
            )}

            {/* Claim Reward */}
            {activeTab === "claim" && (
              <div className="space-y-5">
                <MethodSignature name="claim_reward" params="(user, match_id)" returns="-> bool" color="#34d399" />
                <Input label="Match ID" value={claimMatchId} onChange={(e) => setClaimMatchId(e.target.value)} placeholder="e.g. 1" type="number" />
                {walletAddress ? (
                  <ShimmerButton onClick={handleClaimReward} disabled={isClaiming} shimmerColor="#34d399" className="w-full">
                    {isClaiming ? <><SpinnerIcon /> Claiming...</> : <><GiftIcon /> Claim Reward</>}
                  </ShimmerButton>
                ) : (
                  <button
                    onClick={onConnect}
                    disabled={isConnecting}
                    className="w-full rounded-xl border border-dashed border-[#34d399]/20 bg-[#34d399]/[0.03] py-4 text-sm text-[#34d399]/60 hover:border-[#34d399]/30 hover:text-[#34d399]/80 active:scale-[0.99] transition-all disabled:opacity-50"
                  >
                    Connect wallet to claim reward
                  </button>
                )}

                {claimResult && (
                  <div className="rounded-xl border border-[#34d399]/15 bg-[#34d399]/[0.05] p-4 flex items-center gap-3 animate-fade-in-up">
                    <span className="text-[#34d399]"><CheckIcon /></span>
                    <span className="text-sm text-[#34d399]/90">Reward claimed successfully!</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-white/[0.04] px-6 py-3 flex items-center justify-between">
            <p className="text-[10px] text-white/15">Sports Betting Platform &middot; Soroban</p>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5">
                <span className="h-1 w-1 rounded-full bg-[#7c6cf0]" />
                <span className="font-mono text-[9px] text-white/15">Bet</span>
              </span>
              <span className="text-white/10 text-[8px]">&rarr;</span>
              <span className="flex items-center gap-1.5">
                <span className="h-1 w-1 rounded-full bg-[#fbbf24]" />
                <span className="font-mono text-[9px] text-white/15">Win</span>
              </span>
              <span className="text-white/10 text-[8px]">&rarr;</span>
              <span className="flex items-center gap-1.5">
                <span className="h-1 w-1 rounded-full bg-[#34d399]" />
                <span className="font-mono text-[9px] text-white/15">Claim</span>
              </span>
            </div>
          </div>
        </AnimatedCard>
      </Spotlight>
    </div>
  );
}

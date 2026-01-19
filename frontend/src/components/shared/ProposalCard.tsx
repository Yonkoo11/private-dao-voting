import { Link, useLocation } from 'react-router-dom';
import type { Proposal, ProposalStatus } from '../../types';

interface ProposalCardProps {
  proposal: Proposal;
  compact?: boolean;
  index?: number;
}

function getProposalStatus(proposal: Proposal): ProposalStatus {
  if (proposal.isFinalized) return 'finalized';
  if (Date.now() > proposal.votingEndsAt) return 'ended';
  return 'active';
}

function formatTimeRemaining(timestamp: number): string {
  const diff = timestamp - Date.now();
  if (diff <= 0) return 'Ended';

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `Ends in ${days}d ${hours % 24}h`;
  }
  return `Ends in ${hours}h ${mins}m`;
}

function formatShortId(id: number): string {
  return `0x${id.toString(16).padStart(4, '0')}`;
}

export function ProposalCard({ proposal, compact = false }: ProposalCardProps) {
  const location = useLocation();
  const status = getProposalStatus(proposal);
  const totalVotes = proposal.yesVotes + proposal.noVotes;
  const yesPercent = totalVotes > 0 ? Math.round((proposal.yesVotes / totalVotes) * 100) : 0;

  const statusLabels: Record<ProposalStatus, string> = {
    active: 'ACTIVE',
    ended: 'ENDED',
    finalized: 'FINAL',
  };

  return (
    <Link
      to={`/proposal/${proposal.id}${location.search}`}
      className={`proposal-card-link status-${status}`}
    >
      <article className="proposal-card">
        <div className="proposal-card-content">
          <h3 className="proposal-card-title">{proposal.title}</h3>

          <div className="proposal-card-meta">
            <span className="proposal-id">{formatShortId(proposal.id)}</span>
            <span className="landing-stats-divider">·</span>
            {status === 'active' ? (
              <span className="time-remaining">{formatTimeRemaining(proposal.votingEndsAt)}</span>
            ) : (
              <span className={`status-badge ${status}`}>{statusLabels[status]}</span>
            )}
          </div>

          {!compact && (
            <div className="proposal-card-stats">
              <div className="vote-bar">
                <div
                  className="vote-bar-yes"
                  style={{ width: `${yesPercent}%` }}
                />
              </div>
              <div className="vote-counts">
                <span className="vote-yes">YES {proposal.yesVotes}</span>
                <span className="vote-no">NO {proposal.noVotes}</span>
              </div>
            </div>
          )}
        </div>

        {status === 'active' && (
          <div className="proposal-card-action">
            <span className="vote-cta">VOTE</span>
          </div>
        )}
      </article>
    </Link>
  );
}

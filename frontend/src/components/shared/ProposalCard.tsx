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
    return `${days}d ${hours % 24}h left`;
  }
  return `${hours}h ${mins}m left`;
}

export function ProposalCard({ proposal, compact = false }: ProposalCardProps) {
  const location = useLocation();
  const status = getProposalStatus(proposal);
  const totalVotes = proposal.yesVotes + proposal.noVotes;
  const yesPercent = totalVotes > 0 ? Math.round((proposal.yesVotes / totalVotes) * 100) : 0;

  const statusLabels: Record<ProposalStatus, string> = {
    active: 'Active',
    ended: 'Ended',
    finalized: 'Final',
  };

  return (
    <Link
      to={`/proposal/${proposal.id}${location.search}`}
      className={`proposal-card-link status-${status}`}
    >
      <article className={`proposal-card ${compact ? 'compact' : ''}`}>
        <div className="proposal-card-header">
          <span className="proposal-id">#{String(proposal.id).padStart(4, '0')}</span>
          <span className={`status-badge ${status}`}>
            {statusLabels[status]}
          </span>
        </div>

        <h3 className="proposal-card-title">{proposal.title}</h3>

        {!compact && (
          <p className="proposal-card-description">
            {proposal.description.length > 100
              ? proposal.description.slice(0, 100) + '...'
              : proposal.description}
          </p>
        )}

        <div className="proposal-card-stats">
          <div className="vote-bar">
            <div
              className="vote-bar-yes"
              style={{ width: `${yesPercent}%` }}
            />
          </div>
          <div className="vote-counts">
            <span className="vote-yes">{proposal.yesVotes} approve</span>
            <span className="vote-no">{proposal.noVotes} reject</span>
          </div>
        </div>

        <div className="proposal-card-footer">
          {status === 'active' ? (
            <span className="time-remaining">
              {formatTimeRemaining(proposal.votingEndsAt)}
            </span>
          ) : (
            <span className="total-votes">{totalVotes} votes</span>
          )}
        </div>
      </article>
    </Link>
  );
}

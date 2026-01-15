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
    return `${days}d ${hours % 24}h remaining`;
  }
  return `${hours}h ${mins}m remaining`;
}

export function ProposalCard({ proposal, compact = false, index = 0 }: ProposalCardProps) {
  const location = useLocation();
  const status = getProposalStatus(proposal);
  const totalVotes = proposal.yesVotes + proposal.noVotes;
  const yesPercent = totalVotes > 0 ? Math.round((proposal.yesVotes / totalVotes) * 100) : 0;

  const statusLabels: Record<ProposalStatus, string> = {
    active: 'Active',
    ended: 'Ended',
    finalized: 'Final',
  };

  // Stagger animation and offset based on index
  const cardStyle = {
    '--card-index': index,
    animationDelay: `${index * 100}ms`,
  } as React.CSSProperties;

  return (
    <Link
      to={`/proposal/${proposal.id}${location.search}`}
      className={`proposal-card-link status-${status}`}
      style={cardStyle}
      data-index={index}
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
            {proposal.description.length > 120
              ? proposal.description.slice(0, 120) + '...'
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
            <span className="total-votes">{totalVotes} votes cast</span>
          )}
        </div>
      </article>
    </Link>
  );
}

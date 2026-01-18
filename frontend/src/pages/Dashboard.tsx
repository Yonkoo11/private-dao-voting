import { useState, useMemo, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { fetchProposals } from '../services/solanaService';
import type { Proposal, FilterType } from '../types';

// Demo proposals as fallback when chain is unavailable
const DEMO_PROPOSALS: Proposal[] = [
  {
    id: 1,
    title: 'Treasury Allocation Q1 2026',
    description: 'Allocate 1000 SOL from the DAO treasury to the core development fund for protocol improvements and security audits.',
    authority: 'DaoAuth...xyz',
    votersRoot: '0x7f3a8b...',
    yesVotes: 12,
    noVotes: 3,
    votingEndsAt: Date.now() - 3600000,
    isFinalized: true,
    createdAt: Date.now() - 86400000 * 3,
  },
  {
    id: 2,
    title: 'Community Grant Program',
    description: 'Establish a 500 SOL grant program to fund community-driven development initiatives and educational content.',
    authority: 'DaoAuth...xyz',
    votersRoot: '0x7f3a8b...',
    yesVotes: 8,
    noVotes: 5,
    votingEndsAt: Date.now() - 1800000,
    isFinalized: false,
    createdAt: Date.now() - 86400000 * 2,
  },
  {
    id: 3,
    title: 'Protocol Fee Adjustment',
    description: 'Reduce protocol fees from 0.3% to 0.1% to increase competitiveness and attract more users to the platform.',
    authority: 'DaoAuth...xyz',
    votersRoot: '0x7f3a8b...',
    yesVotes: 1,
    noVotes: 0,
    votingEndsAt: Date.now() + 3600000,
    isFinalized: false,
    createdAt: Date.now() - 86400000,
  },
  {
    id: 4,
    title: 'Governance Token Distribution',
    description: 'Approve the distribution of 10,000 governance tokens to early contributors and active community members.',
    authority: 'DaoAuth...xyz',
    votersRoot: '0x7f3a8b...',
    yesVotes: 0,
    noVotes: 0,
    votingEndsAt: Date.now() + 86400000,
    isFinalized: false,
    createdAt: Date.now() - 3600000,
  },
];

function getProposalStatus(p: Proposal): 'active' | 'ended' | 'finalized' {
  if (p.isFinalized) return 'finalized';
  if (Date.now() > p.votingEndsAt) return 'ended';
  return 'active';
}

function formatTimeRemaining(timestamp: number): string {
  const diff = timestamp - Date.now();
  if (diff <= 0) return 'Ended';

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }
  return `${hours}h ${mins}m`;
}

export function Dashboard() {
  const location = useLocation();
  const [filter, setFilter] = useState<FilterType>('all');
  const [proposals, setProposals] = useState<Proposal[]>(DEMO_PROPOSALS);
  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] = useState<'chain' | 'demo'>('demo');
  const isAuthority = new URLSearchParams(location.search).get('role') === 'authority';

  // Fetch proposals from chain on mount
  useEffect(() => {
    async function loadProposals() {
      setLoading(true);
      try {
        console.log('[Dashboard] Fetching proposals from chain...');
        const chainProposals = await fetchProposals();

        if (chainProposals.length > 0) {
          console.log('[Dashboard] Loaded', chainProposals.length, 'proposals from chain');
          setProposals(chainProposals);
          setDataSource('chain');
        } else {
          console.log('[Dashboard] No proposals on chain, using demo data');
          setProposals(DEMO_PROPOSALS);
          setDataSource('demo');
        }
      } catch (error) {
        console.error('[Dashboard] Failed to fetch proposals:', error);
        setProposals(DEMO_PROPOSALS);
        setDataSource('demo');
      } finally {
        setLoading(false);
      }
    }

    loadProposals();
  }, []);

  const filteredProposals = useMemo(() => {
    if (filter === 'all') return proposals;
    return proposals.filter(p => getProposalStatus(p) === filter);
  }, [filter, proposals]);

  const counts = useMemo(() => ({
    all: proposals.length,
    active: proposals.filter(p => getProposalStatus(p) === 'active').length,
    ended: proposals.filter(p => getProposalStatus(p) === 'ended').length,
    finalized: proposals.filter(p => getProposalStatus(p) === 'finalized').length,
  }), [proposals]);

  const totalVotes = useMemo(() =>
    proposals.reduce((sum, p) => sum + p.yesVotes + p.noVotes, 0),
  [proposals]);

  const filters: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'active', label: 'Active' },
    { key: 'ended', label: 'Ended' },
    { key: 'finalized', label: 'Final' },
  ];

  return (
    <div className="dashboard">
      {/* Left Sidebar - Proposal List */}
      <aside className="dashboard-sidebar">
        <div className="sidebar-header">
          <h2 className="sidebar-title">Proposals</h2>
          <div className="filter-tabs">
            {filters.map(f => (
              <button
                key={f.key}
                className={`filter-tab ${filter === f.key ? 'active' : ''}`}
                onClick={() => setFilter(f.key)}
              >
                {f.label}
                <span className="filter-count">{counts[f.key]}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="proposal-list">
          {loading ? (
            <div className="loading-state">
              <span>Fetching proposals...</span>
            </div>
          ) : filteredProposals.length > 0 ? (
            filteredProposals.map((proposal) => {
              const status = getProposalStatus(proposal);
              const totalVotes = proposal.yesVotes + proposal.noVotes;

              return (
                <Link
                  key={proposal.id}
                  to={`/proposal/${proposal.id}${location.search}`}
                  className={`proposal-item status-${status}`}
                >
                  <div className="proposal-item-header">
                    <span className="proposal-id">#{String(proposal.id).padStart(4, '0')}</span>
                    <span className={`status-badge ${status}`}>
                      {status === 'active' ? 'Active' : status === 'ended' ? 'Ended' : 'Final'}
                    </span>
                  </div>
                  <h3 className="proposal-title">{proposal.title}</h3>
                  <div className="proposal-meta">
                    {status === 'active' ? (
                      <span className="time-remaining">{formatTimeRemaining(proposal.votingEndsAt)}</span>
                    ) : (
                      <span className="vote-summary">{totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}</span>
                    )}
                    <div className="proposal-votes">
                      <span className="vote-count yes">{proposal.yesVotes}</span>
                      <span className="vote-separator">/</span>
                      <span className="vote-count no">{proposal.noVotes}</span>
                    </div>
                  </div>
                </Link>
              );
            })
          ) : (
            <div className="empty-state">
              <p>No proposals found</p>
            </div>
          )}
        </div>

        {isAuthority && (
          <div className="sidebar-actions">
            <Link to={`/create${location.search}`} className="create-btn">
              + Create Proposal
            </Link>
          </div>
        )}
      </aside>

      {/* Right Panel - Stats & Info */}
      <div className="dashboard-main">
        <div className="stats-bar">
          <div className="stat-item">
            <span className="stat-value">{proposals.length}</span>
            <span className="stat-label">Proposals</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{totalVotes}</span>
            <span className="stat-label">Votes Cast</span>
          </div>
          <div className="stat-item highlight">
            <span className="stat-value">{counts.active}</span>
            <span className="stat-label">Active Now</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">100%</span>
            <span className="stat-label">Private</span>
          </div>
          <div className="data-source-indicator">
            {dataSource === 'chain' ? (
              <span className="source-badge chain">On-Chain</span>
            ) : (
              <span className="source-badge demo">Demo</span>
            )}
          </div>
        </div>

        <div className="empty-panel">
          <svg className="empty-panel-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <h3 className="empty-panel-title">Private Collective Action</h3>
          <p className="empty-panel-text">
            Select a proposal from the list to view details and cast your anonymous vote using zero-knowledge proofs.
          </p>
          <div className="feature-badges">
            <span className="feature-badge">ZK Proofs</span>
            <span className="feature-badge">Solana</span>
            <span className="feature-badge">Anonymous</span>
          </div>
        </div>
      </div>
    </div>
  );
}

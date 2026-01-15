import { useState, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { TerminalCard, ProposalCard } from '../components/shared';
import type { Proposal, FilterType } from '../types';

// Demo proposals for hackathon
const DEMO_PROPOSALS: Proposal[] = [
  {
    id: 1,
    title: 'Treasury Allocation Q1 2026',
    description: 'Allocate 1000 SOL from the DAO treasury to the core development fund for protocol improvements and security audits.',
    authority: 'DaoAuth...xyz',
    votersRoot: '0x7f3a8b...',
    yesVotes: 12,
    noVotes: 3,
    votingEndsAt: Date.now() - 3600000, // Ended
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
    votingEndsAt: Date.now() - 1800000, // Ended
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
    votingEndsAt: Date.now() + 3600000, // Active - 1 hour left
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
    votingEndsAt: Date.now() + 86400000, // Active - 24 hours left
    isFinalized: false,
    createdAt: Date.now() - 3600000,
  },
];

function getProposalStatus(p: Proposal): 'active' | 'ended' | 'finalized' {
  if (p.isFinalized) return 'finalized';
  if (Date.now() > p.votingEndsAt) return 'ended';
  return 'active';
}

export function Dashboard() {
  const location = useLocation();
  const [filter, setFilter] = useState<FilterType>('all');
  const isAuthority = new URLSearchParams(location.search).get('role') === 'authority';

  const filteredProposals = useMemo(() => {
    if (filter === 'all') return DEMO_PROPOSALS;
    return DEMO_PROPOSALS.filter(p => getProposalStatus(p) === filter);
  }, [filter]);

  const counts = useMemo(() => ({
    all: DEMO_PROPOSALS.length,
    active: DEMO_PROPOSALS.filter(p => getProposalStatus(p) === 'active').length,
    ended: DEMO_PROPOSALS.filter(p => getProposalStatus(p) === 'ended').length,
    finalized: DEMO_PROPOSALS.filter(p => getProposalStatus(p) === 'finalized').length,
  }), []);

  const filters: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'active', label: 'Active' },
    { key: 'ended', label: 'Ended' },
    { key: 'finalized', label: 'Finalized' },
  ];

  return (
    <div className="dashboard">
      {/* Hero typography - dramatic background text */}
      <div className="hero-text" aria-hidden="true">PRIVATE VOTING</div>

      {/* Main content area - asymmetric layout */}
      <div className="dashboard-layout">
        {/* Left: Proposals */}
        <div className="dashboard-main">
          <TerminalCard title="Proposals">
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

            <div className="proposal-grid">
              {filteredProposals.length > 0 ? (
                filteredProposals.map((proposal, index) => (
                  <ProposalCard key={proposal.id} proposal={proposal} index={index} />
                ))
              ) : (
                <div className="empty-state">
                  <p>No proposals found</p>
                </div>
              )}
            </div>

            {isAuthority && (
              <div className="authority-actions">
                <Link to={`/create${location.search}`} className="create-btn">
                  Create Proposal
                </Link>
              </div>
            )}
          </TerminalCard>
        </div>

        {/* Right: Sticky stats sidebar */}
        <aside className="dashboard-sidebar">
          <div className="sidebar-content">
            <div className="sidebar-header">Live Stats</div>
            <div className="sidebar-stats">
              <div className="sidebar-stat">
                <span className="sidebar-stat-value">{DEMO_PROPOSALS.length}</span>
                <span className="sidebar-stat-label">Proposals</span>
              </div>
              <div className="sidebar-stat">
                <span className="sidebar-stat-value">
                  {DEMO_PROPOSALS.reduce((sum, p) => sum + p.yesVotes + p.noVotes, 0)}
                </span>
                <span className="sidebar-stat-label">Votes Cast</span>
              </div>
              <div className="sidebar-stat highlight">
                <span className="sidebar-stat-value">{counts.active}</span>
                <span className="sidebar-stat-label">Active Now</span>
              </div>
              <div className="sidebar-stat">
                <span className="sidebar-stat-value">100%</span>
                <span className="sidebar-stat-label">Private</span>
              </div>
            </div>
            <div className="sidebar-footer">
              <span className="pulse-dot"></span>
              Zero-Knowledge Proofs
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

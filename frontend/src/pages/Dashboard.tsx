import { useState, useMemo, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { fetchProposals } from '../services/solanaService';
import { ProposalCard } from '../components/shared';
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

export function Dashboard() {
  const location = useLocation();
  const [filter, setFilter] = useState<FilterType>('all');
  const [proposals, setProposals] = useState<Proposal[]>(DEMO_PROPOSALS);
  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] = useState<'chain' | 'demo'>('demo');
  const [showCompleted, setShowCompleted] = useState(true);
  const isAuthority = new URLSearchParams(location.search).get('role') === 'authority';

  // Fetch proposals from chain on mount
  useEffect(() => {
    async function loadProposals() {
      setLoading(true);
      try {
        const chainProposals = await fetchProposals();

        if (chainProposals.length > 0) {
          setProposals(chainProposals);
          setDataSource('chain');
        } else {
          setProposals(DEMO_PROPOSALS);
          setDataSource('demo');
        }
      } catch {
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

  // Separate active and completed proposals
  const activeProposals = useMemo(() =>
    filteredProposals.filter(p => getProposalStatus(p) === 'active'),
  [filteredProposals]);

  const completedProposals = useMemo(() =>
    filteredProposals.filter(p => getProposalStatus(p) !== 'active'),
  [filteredProposals]);

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
      {/* Stats Bar */}
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
        <div className="data-source-indicator">
          {dataSource === 'chain' ? (
            <span className="source-badge chain">On-Chain</span>
          ) : (
            <span className="source-badge demo">Demo</span>
          )}
        </div>
      </div>

      {/* Filter Tabs + Create Button */}
      <div className="section-header">
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
        {isAuthority && (
          <Link to={`/create${location.search}`} className="create-btn">
            Create Proposal
          </Link>
        )}
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="loading-state">
          <span>Loading proposals...</span>
        </div>
      ) : (
        <>
          {/* Active Proposals Section */}
          {(filter === 'all' || filter === 'active') && activeProposals.length > 0 && (
            <div className="dashboard-section">
              <div className="dashboard-section-header">
                <h2 className="dashboard-section-title">Active Proposals</h2>
              </div>
              <div className="proposal-grid">
                {activeProposals.map((proposal, index) => (
                  <ProposalCard key={proposal.id} proposal={proposal} index={index} />
                ))}
              </div>
            </div>
          )}

          {/* Completed Proposals Section */}
          {(filter === 'all' ? completedProposals.length > 0 : (filter !== 'active' && filteredProposals.length > 0)) && (
            <div className="dashboard-section">
              <div className="dashboard-section-header">
                <h2 className="dashboard-section-title">
                  {filter === 'all' ? 'Completed' : filter === 'ended' ? 'Ended' : 'Finalized'}
                </h2>
                {filter === 'all' && (
                  <button
                    className="dashboard-section-toggle"
                    onClick={() => setShowCompleted(!showCompleted)}
                  >
                    {showCompleted ? 'Hide' : 'Show'}
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="currentColor"
                      style={{ transform: showCompleted ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
                    >
                      <path d="M4.427 6.427l3.396 3.396a.25.25 0 00.354 0l3.396-3.396A.25.25 0 0011.396 6H4.604a.25.25 0 00-.177.427z" />
                    </svg>
                  </button>
                )}
              </div>
              {(filter !== 'all' || showCompleted) && (
                <div className="proposal-grid">
                  {(filter === 'all' ? completedProposals : filteredProposals).map((proposal, index) => (
                    <ProposalCard key={proposal.id} proposal={proposal} index={index} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Empty State */}
          {filteredProposals.length === 0 && (
            <div className="empty-state">
              <p>No proposals found</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

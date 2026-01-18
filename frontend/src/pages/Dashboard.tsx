import { useState, useMemo, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { fetchProposals } from '../services/solanaService';
import type { Proposal, FilterType } from '../types';

// Animated hash component
function ScrambleHash() {
  const [hash, setHash] = useState('0x7f3a8b2c9d4e5f6a');
  const chars = '0123456789abcdef';

  useEffect(() => {
    const interval = setInterval(() => {
      const newHash = '0x' + Array.from({ length: 16 }, () =>
        chars[Math.floor(Math.random() * chars.length)]
      ).join('');
      setHash(newHash);
    }, 100);
    return () => clearInterval(interval);
  }, []);

  return <span className="encryption-hash">{hash}...</span>;
}

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
          {/* Animated particle background */}
          <div className="particles-container">
            {[...Array(20)].map((_, i) => (
              <div key={i} className="particle" style={{ '--delay': `${i * 0.5}s`, '--x': `${Math.random() * 100}%`, '--duration': `${15 + Math.random() * 10}s` } as React.CSSProperties} />
            ))}
          </div>

          {/* Circuit lines background */}
          <div className="circuit-lines">
            <svg className="circuit-svg" viewBox="0 0 400 300" preserveAspectRatio="none" aria-hidden="true">
              <path className="circuit-path" d="M0,150 H100 L120,100 H200 L220,150 H300 L320,100 H400" />
              <path className="circuit-path delay-1" d="M0,200 H80 L100,250 H180 L200,200 H280 L300,250 H400" />
              <path className="circuit-path delay-2" d="M0,100 H60 L80,50 H160 L180,100 H260 L280,50 H400" />
              <circle className="circuit-node" cx="120" cy="100" r="4" />
              <circle className="circuit-node delay-1" cx="220" cy="150" r="4" />
              <circle className="circuit-node delay-2" cx="320" cy="100" r="4" />
              <circle className="circuit-node delay-3" cx="100" cy="250" r="4" />
              <circle className="circuit-node delay-4" cx="200" cy="200" r="4" />
            </svg>
          </div>

          {/* Main ZK Shield Visualization */}
          <div className="zk-visualization">
            <div className="shield-container">
              <div className="shield-glow" />
              <div className="shield-ring ring-1" />
              <div className="shield-ring ring-2" />
              <div className="shield-ring ring-3" />
              <svg className="shield-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <div className="lock-icon">
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 1C8.676 1 6 3.676 6 7v2H4v14h16V9h-2V7c0-3.324-2.676-6-6-6zm0 2c2.276 0 4 1.724 4 4v2H8V7c0-2.276 1.724-4 4-4zm0 10c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2z"/>
                </svg>
              </div>
            </div>

            {/* Orbiting data nodes */}
            <div className="orbit orbit-1">
              <div className="orbit-node" />
            </div>
            <div className="orbit orbit-2">
              <div className="orbit-node" />
            </div>
            <div className="orbit orbit-3">
              <div className="orbit-node" />
            </div>
          </div>

          <h3 className="empty-panel-title">
            <span className="title-prefix">Zero-Knowledge</span>
            <span className="title-main">Private Voting</span>
          </h3>
          <p className="empty-panel-text">
            Cast anonymous votes with cryptographic proofs. Your choice remains hidden—even from the DAO.
          </p>

          <div className="feature-badges">
            <span className="feature-badge">
              <span className="badge-icon">◈</span>
              ZK Proofs
            </span>
            <span className="feature-badge">
              <span className="badge-icon">◎</span>
              Solana
            </span>
            <span className="feature-badge">
              <span className="badge-icon">◉</span>
              Anonymous
            </span>
          </div>

          {/* Animated encryption text */}
          <div className="encryption-display">
            <span className="encryption-label">Proof:</span>
            <ScrambleHash />
          </div>
        </div>
      </div>
    </div>
  );
}

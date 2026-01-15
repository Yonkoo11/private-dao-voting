import { Link, useLocation } from 'react-router-dom';

export function Navigation() {
  const location = useLocation();
  const pathParts = location.pathname.split('/').filter(Boolean);

  // Build breadcrumb trail
  const breadcrumbs = [
    { path: '/', label: 'INDEX' },
  ];

  if (pathParts[0] === 'proposal' && pathParts[1]) {
    breadcrumbs.push({
      path: `/proposal/${pathParts[1]}`,
      label: `PROPOSAL::${pathParts[1].padStart(4, '0')}`
    });
    if (pathParts[2] === 'results') {
      breadcrumbs.push({ path: location.pathname, label: 'RESULTS' });
    }
  } else if (pathParts[0] === 'create') {
    breadcrumbs.push({ path: '/create', label: 'CREATE::NEW' });
  } else if (pathParts[0] === 'register') {
    breadcrumbs.push({ path: '/register', label: 'REGISTER' });
  } else if (pathParts[0] === 'about') {
    breadcrumbs.push({ path: '/about', label: 'PROTOCOL::OVERVIEW' });
  }

  return (
    <nav className="terminal-nav">
      <span className="nav-prefix">&gt;</span>
      <span className="nav-path">
        {breadcrumbs.map((crumb, i) => (
          <span key={crumb.path}>
            {i > 0 && <span className="nav-sep">/</span>}
            {i === breadcrumbs.length - 1 ? (
              <span className="nav-current">{crumb.label}</span>
            ) : (
              <Link to={crumb.path + location.search} className="nav-link">
                {crumb.label}
              </Link>
            )}
          </span>
        ))}
      </span>
      <span className="nav-cursor">_</span>
    </nav>
  );
}

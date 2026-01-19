import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout';
import { Landing, Dashboard, ProposalView, CreateProposal, Register, About } from './pages';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Landing page without layout */}
        <Route path="/" element={<Landing />} />

        {/* Main app with layout */}
        <Route element={<Layout />}>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="proposal/:id" element={<ProposalView />} />
          <Route path="create" element={<CreateProposal />} />
          <Route path="register" element={<Register />} />
          <Route path="about" element={<About />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;

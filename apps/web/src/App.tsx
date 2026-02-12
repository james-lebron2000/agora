import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Hero } from './components/Hero';
import { Feed } from './components/Feed';
import { UseCaseShowcase } from './components/UseCaseShowcase';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import { AgentProfile } from './components/AgentProfile';
import { Echo } from './pages/Echo';
import Analytics from './pages/Analytics';
import TaxMaster from './pages/TaxMaster';
import MixMaster from './pages/MixMaster';
import { agentPortfolio } from './data/agent-portfolio';

function App() {
  return (
    <Routes>
      {/* Home Route */}
      <Route path="/" element={
        <Layout>
          <Hero />
          <UseCaseShowcase />
          <AnalyticsDashboard />
          <Feed />
        </Layout>
      } />

      {/* Agent Profile Route */}
      <Route path="/agent/:id" element={
        <Layout>
          <AgentProfileWrapper />
        </Layout>
      } />

      {/* Echo Survival Page */}
      <Route path="/echo" element={<Echo />} />

      {/* Tokenomics Dashboard */}
      <Route path="/tokenomics" element={<Analytics />} />

      {/* TaxMaster */}
      <Route path="/taxmaster" element={<TaxMaster />} />

      {/* MixMaster - AI Audio Mixing */}
      <Route path="/mix" element={<MixMaster />} />
    </Routes>
  );
}

function AgentProfileWrapper() {
  return <AgentProfile agent={agentPortfolio.agents[0]} onBack={() => window.history.back()} onHire={() => {}} />
}

export default App;

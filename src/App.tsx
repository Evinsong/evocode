import { Routes, Route } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout'
import WorkspacePage from './pages/WorkspacePage'
import KnowledgeHubPage from './pages/KnowledgeHubPage'
import AuditTrailPage from './pages/AuditTrailPage'
import SettingsPage from './pages/SettingsPage'
import OnboardingPage from './pages/OnboardingPage'

function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<WorkspacePage />} />
        <Route path="/knowledge" element={<KnowledgeHubPage />} />
        <Route path="/audit" element={<AuditTrailPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
      <Route path="/onboarding" element={<OnboardingPage />} />
    </Routes>
  )
}

export default App

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { JoinPage } from './pages/JoinPage';
import { DmDashboardPage } from './pages/DmDashboardPage';
import { CampaignDashboardPage } from './pages/CampaignDashboardPage';
import { CharactersPage } from './pages/CharactersPage';
import { CharacterCreatePage } from './pages/CharacterCreatePage';
import { CharacterSheetPage } from './pages/CharacterSheetPage';
import { EnemiesPage } from './pages/EnemiesPage';
import { EnemyEditPage } from './pages/EnemyEditPage';
import { NpcsPage } from './pages/NpcsPage';
import { NpcEditPage } from './pages/NpcEditPage';
import { EncountersPage } from './pages/EncountersPage';
import { EncounterEditPage } from './pages/EncounterEditPage';
import { SessionsPage } from './pages/SessionsPage';
import { LiveSessionPage } from './pages/LiveSessionPage';
import { LorePage } from './pages/LorePage';
import { LoreEditPage } from './pages/LoreEditPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="join" element={<JoinPage />} />
          <Route path="dm" element={<DmDashboardPage />} />
          <Route path="campaign/:campaignId" element={<CampaignDashboardPage />} />
          <Route path="campaign/:campaignId/characters" element={<CharactersPage />} />
          <Route path="campaign/:campaignId/characters/new" element={<CharacterCreatePage />} />
          <Route path="campaign/:campaignId/characters/:characterId" element={<CharacterSheetPage />} />
          <Route path="campaign/:campaignId/enemies" element={<EnemiesPage />} />
          <Route path="campaign/:campaignId/enemies/:enemyId" element={<EnemyEditPage />} />
          <Route path="campaign/:campaignId/npcs" element={<NpcsPage />} />
          <Route path="campaign/:campaignId/npcs/:npcId" element={<NpcEditPage />} />
          <Route path="campaign/:campaignId/encounters" element={<EncountersPage />} />
          <Route path="campaign/:campaignId/encounters/:encounterId" element={<EncounterEditPage />} />
          <Route path="campaign/:campaignId/lore" element={<LorePage />} />
          <Route path="campaign/:campaignId/lore/:noteId" element={<LoreEditPage />} />
          <Route path="campaign/:campaignId/sessions" element={<SessionsPage />} />
          <Route path="campaign/:campaignId/sessions/new" element={<SessionsPage />} />
          <Route path="campaign/:campaignId/session/:sessionId" element={<LiveSessionPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

import { useEffect, useState } from 'react';
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { useSession } from './shared/session.js';
import { getSampleData } from './shared/sampleData.js';
import TabBar from './shared/TabBar.jsx';
import DesktopLoadingPage from './features/admin/DesktopLoadingPage.jsx';
import Opening from './features/home/Opening.jsx';
import HomePage from './features/home/HomePage.jsx';
import CrewSignInPage from './features/auth/CrewSignInPage.jsx';
import PinPage from './features/auth/PinPage.jsx';
import ProfilePage from './features/profile/ProfilePage.jsx';
import BodyPage from './features/body/BodyPage.jsx';
import SystemDetailPage from './features/body/SystemDetailPage.jsx';
import CyclePage from './features/womens-health/CyclePage.jsx';
import LogSymptomPage from './features/womens-health/LogSymptomPage.jsx';
import MeasurePage from './features/measure/MeasurePage.jsx';
import DoctorPage from './features/ai-doctor/DoctorPage.jsx';
import CheckinStartPage from './features/mood-face/CheckinStartPage.jsx';
import RecordPage from './features/mood-voice/RecordPage.jsx';
import GamePage from './features/game/GamePage.jsx';
import ResultsPage from './features/mood-results/ResultsPage.jsx';
import FamilyPage from './features/hugs/FamilyPage.jsx';
import SendHugPage from './features/hugs/SendHugPage.jsx';
import JoinPage from './features/family-app/JoinPage.jsx';
import HomeWindowPage from './features/home-window/HomeWindowPage.jsx';
import HealthPage from './features/health/HealthPage.jsx';
import SleepPage from './features/health/SleepPage.jsx';
import CardioPage from './features/health/CardioPage.jsx';
import CheckinSleepPage from './features/health/CheckinSleepPage.jsx';
import AvatarPage from './features/avatar/AvatarPage.jsx';
import MusclesPage from './features/muscles/MusclesPage.jsx';
import WorkoutPage from './features/muscles/WorkoutPage.jsx';
import GardenPage from './features/garden/GardenPage.jsx';
import AdminSignInPage from './features/admin/AdminSignInPage.jsx';
import CrewOverviewPage from './features/admin/CrewOverviewPage.jsx';
import AddCrewPage from './features/admin/AddCrewPage.jsx';
import CrewMemberPage from './features/admin/CrewMemberPage.jsx';
import SurgeonPage from './features/surgeon/SurgeonPage.jsx';

// Phone screens without the tab bar.
const NO_TABBAR = ['/signin', '/send', '/join', '/checkin/record', '/checkin/game', '/checkin/sleep', '/body/cycle/log', '/body/muscles/workout'];

function isLaptop(pathname) {
  return pathname === '/surgeon' || pathname === '/admin' || pathname.startsWith('/admin/');
}

// Wraps every page: phone width + tab bar, or full-width laptop layout.
function Layout() {
  const { pathname } = useLocation();
  const laptop = isLaptop(pathname);
  const showTabBar = !laptop && !NO_TABBAR.some((p) => pathname === p || pathname.startsWith(p + '/'));
  return (
    <div className={laptop ? 'laptop' : 'phone'}>
      <Outlet />
      {showTabBar && <TabBar />}
    </div>
  );
}

// Route guards (sign-in is simulated, see shared/session.js).
function RequireCrew() {
  return useSession() ? <Outlet /> : <Navigate to="/signin" replace />;
}
function RequireAdmin() {
  const session = useSession();
  return session && session.role === 'admin' ? <Outlet /> : <Navigate to="/admin/signin" replace />;
}

export default function App() {
  const [ready, setReady] = useState(false);

  // Show the opening screen until today's data has loaded, for at least 2 seconds.
  useEffect(() => {
    const minimum = new Promise((resolve) => setTimeout(resolve, 2000));
    const load = getSampleData('today').catch(() => null); // server down: still open the app
    Promise.all([minimum, load]).then(() => setReady(true));
  }, []);

  if (!ready) {
  const isDesktop =
    typeof window !== 'undefined' &&
    window.matchMedia('(min-width: 58rem)').matches;

  return isDesktop ? <DesktopLoadingPage /> : <Opening />;
}

  return (
    <Routes>
      <Route element={<Layout />}>
        {/* Always open */}
        <Route path="/send" element={<SendHugPage />} />
        <Route path="/join" element={<JoinPage />} />
        <Route path="/signin" element={<CrewSignInPage />} />
        <Route path="/signin/pin" element={<PinPage />} />
        <Route path="/admin/signin" element={<AdminSignInPage />} />

        {/* Crew phone routes */}
        <Route element={<RequireCrew />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/body" element={<BodyPage />} />
          <Route path="/body/cycle" element={<CyclePage />} />
          <Route path="/body/cycle/log" element={<LogSymptomPage />} />
          <Route path="/body/muscles" element={<MusclesPage />} />
          <Route path="/checkin/sleep" element={<CheckinSleepPage />} />
          <Route path="/health" element={<HealthPage />} />
          <Route path="/health/sleep" element={<SleepPage />} />
          <Route path="/health/cardio" element={<CardioPage />} />
          <Route path="/body/muscles/workout" element={<WorkoutPage />} />
          <Route path="/body/:system" element={<SystemDetailPage />} />
          <Route path="/measure" element={<MeasurePage />} />
          <Route path="/doctor" element={<DoctorPage />} />
          <Route path="/checkin" element={<CheckinStartPage />} />
          <Route path="/checkin/record" element={<RecordPage />} />
          <Route path="/checkin/game" element={<GamePage />} />
          <Route path="/checkin/results" element={<ResultsPage />} />
          <Route path="/family" element={<FamilyPage />} />
          <Route path="/family/window" element={<HomeWindowPage />} />
          <Route path="/family/avatar" element={<AvatarPage />} />
          <Route path="/garden" element={<GardenPage />} />
        </Route>

        {/* Mission Control and flight surgeon (laptop) */}
        <Route element={<RequireAdmin />}>
          <Route path="/admin" element={<CrewOverviewPage />} />
          <Route path="/admin/crew/new" element={<AddCrewPage />} />
          <Route path="/admin/crew/:id" element={<CrewMemberPage />} />
          <Route path="/surgeon" element={<SurgeonPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

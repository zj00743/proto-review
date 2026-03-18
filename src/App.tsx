import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { UserProvider, useUser } from './hooks/useUser';
import { UserPrompt } from './components/UserPrompt';
import { HomePage } from './pages/HomePage';
import { ProjectPage } from './pages/ProjectPage';

function AppRoutes() {
  const { user, setUserName } = useUser();

  if (!user) {
    return <UserPrompt onSubmit={setUserName} />;
  }

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/project/:id" element={<ProjectPage />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <UserProvider>
        <AppRoutes />
      </UserProvider>
    </BrowserRouter>
  );
}

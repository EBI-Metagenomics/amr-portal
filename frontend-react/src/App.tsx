import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import HomePage from '@components/pages/HomePage';
import PortalSubheader from '@components/layout/PortalSubheader';
import EbiFooter from '@components/layout/EbiFooter';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => {
  const baseUrl = import.meta.env.BASE_URL;
  const routerBasename = (() => {
    if (!baseUrl) return '/';
    const trimmed = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    return trimmed === '' ? '/' : trimmed;
  })();

  return (
    <QueryClientProvider client={queryClient}>
      <PortalSubheader />
      <main className="app-main">
        <Router basename={routerBasename}>
          <Routes>
            <Route path="/" element={<HomePage />} />
          </Routes>
        </Router>
      </main>
      <EbiFooter />
    </QueryClientProvider>
  );
};

export default App;

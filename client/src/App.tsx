import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { TestScenarios } from './pages/TestScenarios';
import { CreateScenario } from './pages/CreateScenario';
import { TestExecutions } from './pages/TestExecutions';
import { ExecutionDetail } from './pages/ExecutionDetail';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5分
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/scenarios" element={<TestScenarios />} />
            <Route path="/scenarios/create" element={<CreateScenario />} />
            <Route path="/executions" element={<TestExecutions />} />
            <Route path="/executions/:id" element={<ExecutionDetail />} />
          </Routes>
        </Layout>
      </Router>
    </QueryClientProvider>
  );
}

export default App; 

import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/dashboard/Dashboard';
import ProjectLayout from './pages/project/ProjectLayout';
import Documentation from './pages/docs/Documentation';
import { store } from './lib/store';
import { Loader2 } from 'lucide-react';

const App = () => {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    store.init().then(() => setReady(true));
  }, []);

  if (!ready) {
    return (
      <div className="h-screen w-screen bg-[#0f1117] flex items-center justify-center text-white">
        <Loader2 className="w-8 h-8 animate-spin mr-2 text-primary" />
        <span>Initializing Database...</span>
      </div>
    );
  }

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/project/:projectId/*" element={<ProjectLayout />} />
        <Route path="/docs" element={<Documentation />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
};

export default App;

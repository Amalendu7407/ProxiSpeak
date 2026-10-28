import React from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext.jsx';
import { AuthPage } from './pages/AuthPage.jsx';
import { OfficePage } from './pages/OfficePage.jsx';
import { Loader2 } from 'lucide-react';

function AppContent() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-dark-900 text-white gap-3">
        <Loader2 className="w-8 h-8 text-brand-400 animate-spin" />
        <p className="text-xs text-slate-400 font-mono tracking-wider uppercase">Loading ProxiSpeak...</p>
      </div>
    );
  }

  return isAuthenticated ? <OfficePage /> : <AuthPage />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

import React from 'react';
import { useApp } from './context/AppContext';
import MainLayout from './components/layout/MainLayout';
import Dashboard from './modules/Dashboard/Dashboard';
import Reports from './modules/Reports/Reports';
import Tasks from './modules/Tasks/Tasks';
import Knowledge from './modules/Knowledge/Knowledge';
import Settings from './modules/Settings/Settings';
import Login from './modules/Login/Login';
import Admin from './modules/Admin/Admin';
import PendingApproval from './components/auth/PendingApproval';

export default function App() {
  const { activeModule, isAuthenticated, isPending } = useApp();

  if (!isAuthenticated) {
    return <Login />;
  }

  if (isPending) {
    return <PendingApproval />;
  }

  return (
    <MainLayout>
      {activeModule === 'dashboard' && <Dashboard />}
      {activeModule === 'reports' && <Reports />}
      {activeModule === 'tasks' && <Tasks />}
      {activeModule === 'knowledge' && <Knowledge />}
      {activeModule === 'settings' && <Settings />}
      {activeModule === 'admin' && <Admin />}
    </MainLayout>
  );
}

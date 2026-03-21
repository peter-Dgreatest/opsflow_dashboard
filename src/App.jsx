import { useState } from 'react';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { Sidebar } from './components/layout';
import LoginPage from './pages/Login';
import Dashboard from './pages/Dashboard';
import Jobs from './pages/Jobs';
import Leads from './pages/Leads';
import Customers from './pages/Customers';
import Crew from './pages/Crew';
import Equipment from './pages/Equipment';
import Vendors from './pages/Vendors';
import Payments from './pages/Payments';
import Expenses from './pages/Expenses';
import Reminders from './pages/Reminders';
import Reports from './pages/Reports';
import Settings from './pages/Settings';

const PAGES = {
  dashboard: Dashboard,
  jobs: Jobs,
  leads: Leads,
  customers: Customers,
  crew: Crew,
  equipment: Equipment,
  vendors: Vendors,
  payments: Payments,
  expenses: Expenses,
  reminders: Reminders,
  reports: Reports,
  settings: Settings,
};

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// inside AppShell
function AppShell() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-lime-400 flex items-center justify-center text-bg font-bold text-lg">O</div>
          <div className="w-5 h-5 border-2 border-lime-400/30 border-t-lime-400 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!user) return <LoginPage />;

  return (
    <div className="flex h-screen bg-bg overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/jobs" element={<Jobs />} />
          <Route path="/leads" element={<Leads />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/crew" element={<Crew />} />
          <Route path="/equipment" element={<Equipment />} />
          <Route path="/vendors" element={<Vendors />} />
          <Route path="/payments" element={<Payments />} />
          <Route path="/expenses" element={<Expenses />} />
          <Route path="/reminders" element={<Reminders />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
    </div>
  );
}

// function AppShell() {
//   const { user, loading } = useAuth();
//   const [page, setPage]   = useState('dashboard');

//   if (loading) {
//     return (
//       <div className="min-h-screen bg-bg flex items-center justify-center">
//         <div className="flex flex-col items-center gap-4">
//           <div className="w-10 h-10 rounded-xl bg-lime-400 flex items-center justify-center text-bg font-bold text-lg">O</div>
//           <div className="w-5 h-5 border-2 border-lime-400/30 border-t-lime-400 rounded-full animate-spin" />
//         </div>
//       </div>
//     );
//   }

//   if (!user) return <LoginPage />;

//   const Page = PAGES[page] || Dashboard;

//   return (
//     <div className="flex h-screen bg-bg overflow-hidden">
//       <Sidebar active={page} onChange={setPage} />
//       <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
//         <Page />
//       </main>
//     </div>
//   );
// }


export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppShell />
      </BrowserRouter>
    </AuthProvider>
  );
}

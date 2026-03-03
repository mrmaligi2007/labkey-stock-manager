import { useState, useEffect } from 'react';
import { LogOut } from 'lucide-react';
import { Auth } from './components/Auth';
import { supabase } from './lib/supabase';

function App() {
  const [session, setSession] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [viewMode, setViewMode] = useState('dashboard');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthChecked(true);
    });
  }, []);

  if (!authChecked) return <div>Loading...</div>;
  if (!session) return <Auth onAuthSuccess={() => window.location.reload()} />;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b p-4">
        <div className="flex justify-between items-center">
          <h1 className="font-bold">LabKey Manager</h1>
          <button onClick={() => supabase.auth.signOut()}>
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>
      
      <nav className="bg-white border-b p-4">
        <div className="flex gap-4">
          {['dashboard', 'inventory', 'sales', 'customers'].map(tab => (
            <button 
              key={tab}
              onClick={() => setViewMode(tab)}
              className={viewMode === tab ? 'text-blue-600 font-bold' : 'text-gray-600'}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </nav>

      <main className="p-4">
        {viewMode === 'dashboard' && <div>Dashboard - Stock & Sales Overview</div>}
        {viewMode === 'inventory' && <div>Inventory Management</div>}
        {viewMode === 'sales' && <div>Sales & Invoices</div>}
        {viewMode === 'customers' && <div>Customer Database</div>}
      </main>
    </div>
  );
}

export default App;

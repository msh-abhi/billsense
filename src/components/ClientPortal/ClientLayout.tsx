import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Receipt, FolderOpen, LogOut, Clock, Settings, HelpCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

const navigation = [
  { name: 'Dashboard', href: '/client/dashboard', icon: LayoutDashboard },
  { name: 'Invoices', href: '/client/invoices', icon: Receipt },
  { name: 'Projects', href: '/client/projects', icon: FolderOpen },
  { name: 'Time Logs', href: '/client/time-logs', icon: Clock },
  { name: 'Settings', href: '/client/settings', icon: Settings },
  { name: 'Support', href: '/client/support', icon: HelpCircle },
];

export const ClientLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [company, setCompany] = useState<{ name: string, logo_url: string | null } | null>(null);

  useEffect(() => {
    if (user) {
      loadCompanyBranding();
    }
  }, [user]);

  const loadCompanyBranding = async () => {
    try {
      // Optimized: Single query with joins instead of 3 sequential queries
      const { data, error } = await supabase
        .from('client_users')
        .select(`
          client_id,
          clients!inner (
            company_id,
            companies!inner (
              name,
              logo_url
            )
          )
        `)
        .eq('id', user!.id)
        .single();

      if (error) throw error;

      // Extract company data from nested structure
      // @ts-ignore - Supabase types don't handle nested joins well
      const companyData = data?.clients?.companies;
      if (companyData) {
        setCompany({
          name: companyData.name,
          logo_url: companyData.logo_url
        });
      }
    } catch (error) {
      console.error('Error loading branding:', error);
      // Fallback to default branding on error
      setCompany({ name: 'Client Portal', logo_url: null });
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/client/signin');
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="flex h-full w-64 flex-col bg-slate-900 text-white border-r border-slate-800">
        <div className="flex min-h-[4rem] items-center px-6 py-3 border-b border-slate-800 bg-slate-900">
          <div className="flex items-center w-full">
            {company?.logo_url ? (
              <img src={company.logo_url} alt={company.name} className="h-8 w-8 rounded object-cover flex-shrink-0" />
            ) : (
              <div className="bg-blue-600 p-1.5 rounded-lg mr-3 flex-shrink-0">
                <Clock className="h-5 w-5 text-white" />
              </div>
            )}
            <div className="flex flex-col ml-2 min-w-0">
              <span className="text-base font-bold tracking-tight text-white leading-tight break-words">
                {company?.name || 'Client Portal'}
              </span>
              <span className="text-xs text-slate-500 truncate mt-0.5">
                Powered by BillSense
              </span>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4 px-2">
            Menu
          </div>
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-900/20'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}
              >
                <item.icon
                  className={`mr-3 h-5 w-5 transition-colors ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-white'
                    }`}
                />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="px-4 py-4 border-t border-slate-800 bg-slate-900">
          <div className="mb-4 px-2">
            <p className="text-xs text-slate-500">Logged in as</p>
            <p className="text-sm font-medium text-slate-300 truncate">{user?.email}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="group flex w-full items-center px-3 py-2.5 text-sm font-medium text-slate-400 rounded-lg hover:bg-red-500/10 hover:text-red-400 transition-colors"
          >
            <LogOut className="mr-3 h-5 w-5 text-slate-500 group-hover:text-red-400" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
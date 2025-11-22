import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Receipt, FolderOpen, LogOut, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

const navigation = [
  { name: 'Dashboard', href: '/client/dashboard', icon: LayoutDashboard },
  { name: 'Invoices', href: '/client/invoices', icon: Receipt },
  { name: 'Projects', href: '/client/projects', icon: FolderOpen },
  { name: 'Time Logs', href: '/client/time-logs', icon: Clock },
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
      // 1. Get client_id for current user
      const { data: clientUser } = await supabase
        .from('client_users')
        .select('client_id')
        .eq('id', user!.id)
        .single();

      if (!clientUser) return;

      // 2. Get company_id from client
      const { data: client } = await supabase
        .from('clients')
        .select('company_id')
        .eq('id', clientUser.client_id)
        .single();

      if (!client) return;

      // 3. Get company details
      const { data: companyData } = await supabase
        .from('companies')
        .select('name, logo_url')
        .eq('id', client.company_id)
        .single();

      if (companyData) {
        setCompany(companyData);
      }
    } catch (error) {
      console.error('Error loading branding:', error);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/client/signin');
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="flex h-full w-64 flex-col bg-white border-r border-gray-200">
        <div className="flex h-16 items-center px-6 border-b border-gray-200">
          <div className="flex items-center">
            {company?.logo_url ? (
              <img src={company.logo_url} alt={company.name} className="h-8 w-8 rounded object-cover" />
            ) : (
              <Clock className="h-8 w-8 text-blue-600" />
            )}
            <span className="ml-2 text-xl font-bold text-gray-900 truncate">
              {company?.name || 'Client Portal'}
            </span>
          </div>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-1">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }`}
              >
                <item.icon
                  className={`mr-3 h-5 w-5 transition-colors ${isActive ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'
                    }`}
                />
                {item.name}
              </Link>
            );
          })}
        </nav>
        <div className="px-4 py-4 border-t border-gray-200">
          <button
            onClick={handleSignOut}
            className="group flex w-full items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50 hover:text-gray-900 transition-colors"
          >
            <LogOut className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
};
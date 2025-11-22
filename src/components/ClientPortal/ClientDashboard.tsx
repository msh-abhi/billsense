import React, { useState, useEffect } from 'react';
import { ClientLayout } from './ClientLayout';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext'; // We'll use this to get the logged-in user
import { FolderOpen, FileText, DollarSign } from 'lucide-react';

// Define an interface for our dashboard stats
interface ClientDashboardStats {
  activeProjects: number;
  unpaidInvoices: number;
  totalBilled: number;
  clientName: string;
  currency: string;
}

export const ClientDashboard: React.FC = () => {
  const { user } = useAuth(); // Get the authenticated user from our context
  const [stats, setStats] = useState<ClientDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    if (!user) return;

    try {
      // 1. Find the client record linked to the logged-in auth user
      const { data: clientUser, error: clientUserError } = await supabase
        .from('client_users')
        .select('client_id')
        .eq('id', user.id)
        .single();

      if (clientUserError || !clientUser) {
        console.error('Client user lookup error:', clientUserError);
        throw new Error('Could not find associated client account.');
      }

      const clientId = clientUser.client_id;

      // 2. Fetch the client's details, including their projects and invoices
      // We need to fetch these separately or ensure RLS allows the join
      // With the new RLS, we can fetch projects and invoices directly if we want, 
      // but fetching via client is also fine if the policy allows.
      // Let's fetch via client to get the aggregate view.
      const { data: clientData, error: clientDataError } = await supabase
        .from('clients')
        .select(`
          name,
          currency,
          projects (id, status),
          invoices (total, status)
        `)
        .eq('id', clientId)
        .single();

      if (clientDataError || !clientData) {
        throw new Error("Could not load client details.");
      }

      // 3. Calculate the stats
      const activeProjects = clientData.projects.filter(p => p.status === 'active').length;
      const unpaidInvoices = clientData.invoices.filter(i => i.status === 'sent' || i.status === 'draft').length;
      const totalBilled = clientData.invoices.reduce((sum, invoice) => sum + invoice.total, 0);

      setStats({
        clientName: clientData.name,
        currency: clientData.currency,
        activeProjects,
        unpaidInvoices,
        totalBilled,
      });

    } catch (error) {
      console.error("Error loading client dashboard:", error);
      // Handle error display if necessary
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <ClientLayout>
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="h-24 bg-gray-200 rounded-lg"></div>
            <div className="h-24 bg-gray-200 rounded-lg"></div>
            <div className="h-24 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome, {stats?.clientName || ''}</h1>
          <p className="text-sm text-gray-600 mt-1">Here's a summary of your projects and invoices.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-gray-700">Active Projects</h3>
              <p className="text-3xl font-bold mt-2">{stats?.activeProjects || 0}</p>
            </div>
            <div className="p-3 rounded-lg bg-blue-50 text-blue-600">
              <FolderOpen className="h-6 w-6" />
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-gray-700">Unpaid Invoices</h3>
              <p className="text-3xl font-bold mt-2">{stats?.unpaidInvoices || 0}</p>
            </div>
            <div className="p-3 rounded-lg bg-orange-50 text-orange-600">
              <FileText className="h-6 w-6" />
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-gray-700">Total Billed</h3>
              <p className="text-3xl font-bold mt-2">{stats?.currency} {stats?.totalBilled.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}</p>
            </div>
            <div className="p-3 rounded-lg bg-green-50 text-green-600">
              <DollarSign className="h-6 w-6" />
            </div>
          </div>
        </div>

        {/* We will add recent activity lists here next */}

      </div>
    </ClientLayout>
  );
};
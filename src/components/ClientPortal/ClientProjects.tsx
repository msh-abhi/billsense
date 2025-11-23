import React, { useState, useEffect } from 'react';
import { ClientLayout } from './ClientLayout';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { FolderOpen } from 'lucide-react';

interface ClientProject {
  id: string;
  name: string;
  status: string;
  project_type: 'hourly' | 'fixed';
  total_hours: number;
  total_earnings: number;
  currency: string;
}

export const ClientProjects: React.FC = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<ClientProject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadProjects();
    }
  }, [user]);

  const loadProjects = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          id, name, status, project_type, hourly_rate, fixed_price, currency,
          time_entries ( duration )
        `);

      if (error) throw error;

      const formattedProjects = data.map(p => {
        const totalHours = p.time_entries.reduce((sum, log) => sum + (log.duration || 0), 0) / 3600;
        const totalEarnings = p.project_type === 'fixed'
          ? p.fixed_price
          : totalHours * p.hourly_rate;

        return {
          id: p.id,
          name: p.name,
          status: p.status,
          project_type: p.project_type,
          currency: p.currency,
          total_hours: Math.round(totalHours * 100) / 100,
          total_earnings: Math.round(totalEarnings * 100) / 100
        };
      });

      setProjects(formattedProjects);
    } catch (error) {
      console.error("Error loading client projects:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Active</span>;
      case 'completed':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Completed</span>;
      case 'on_hold':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">On Hold</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{status}</span>;
    }
  };

  return (
    <ClientLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Your Projects</h1>
          <p className="text-sm text-gray-600 mt-1">An overview of all your projects with us.</p>
        </div>

        <div className="space-y-4">
          {loading ? (
            <p>Loading projects...</p>
          ) : projects.length > 0 ? (
            projects.map(project => (
              <Link to={`/client/projects/${project.id}`} key={project.id} className="block bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold text-blue-600">{project.name}</h3>
                    <p className="text-sm text-gray-500 capitalize">{project.project_type} Project</p>
                  </div>
                  <div>{getStatusBadge(project.status)}</div>
                </div>
                <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Total Hours Logged</p>
                    <p className="font-semibold text-gray-800">{project.total_hours}h</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Total Billed</p>
                    <p className="font-semibold text-gray-800">{project.currency} {project.total_earnings.toLocaleString()}</p>
                  </div>
                </div>
              </Link>
            ))
          ) : (
            <div className="text-center py-10 text-gray-500">
              <FolderOpen className="mx-auto h-8 w-8 text-gray-400 mb-2" />
              You do not have any projects yet.
            </div>
          )}
        </div>
      </div>
    </ClientLayout>
  );
};
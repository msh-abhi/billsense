import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ClientLayout } from './ClientLayout';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { ArrowLeft, Clock } from 'lucide-react';

interface TimeLog {
  id: string;
  task_description: string | null;
  start_time: string;
  duration: number | null;
}

interface ProjectDetails {
  id: string;
  name: string;
  description: string | null;
  status: string;
  time_logs: TimeLog[];
}

export const ClientProjectDetails: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const { user } = useAuth();
  const [project, setProject] = useState<ProjectDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && projectId) {
      loadProjectDetails();
    }
  }, [user, projectId]);

  const loadProjectDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          id, name, description, status,
          time_logs (id, task_description, start_time, duration)
        `)
        .eq('id', projectId)
        .single();
      
      if (error) throw error;
      
      // Sort time logs by start time
      data.time_logs.sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());
      
      setProject(data);
    } catch (error) {
      console.error("Error loading project details:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (seconds === null) return 'N/A';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return <ClientLayout><p>Loading project details...</p></ClientLayout>;
  }

  if (!project) {
    return <ClientLayout><p>Project not found.</p></ClientLayout>;
  }

  return (
    <ClientLayout>
      <div className="space-y-6">
        <div>
          <Link to="/client/projects" className="flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to All Projects
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
          {project.description && <p className="text-gray-600 mt-1">{project.description}</p>}
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Time Logs</h2>
          <div className="space-y-3">
            {project.time_logs.length > 0 ? (
              project.time_logs.map(log => (
                <div key={log.id} className="p-3 bg-gray-50 rounded-md border border-gray-200 flex justify-between items-center">
                  <div>
                    <p className="font-medium text-gray-800">{log.task_description || 'General project work'}</p>
                    <p className="text-xs text-gray-500">{formatDate(log.start_time)}</p>
                  </div>
                  <div className="flex items-center text-sm font-semibold text-gray-700">
                    <Clock className="h-4 w-4 mr-1.5 text-gray-400" />
                    {formatDuration(log.duration)}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-sm">No time has been logged for this project yet.</p>
            )}
          </div>
        </div>
      </div>
    </ClientLayout>
  );
};
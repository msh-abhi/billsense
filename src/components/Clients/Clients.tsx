import React, { useState, useEffect } from 'react'
import { Layout } from '../Layout/Layout'
import { ClientCard } from './ClientCard'
import { ClientForm } from './ClientForm'
import { Plus, Search, Filter, List, Grid, Mail, RefreshCw, AlertTriangle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { Toast } from '../common/Toast'

interface Client {
  id: string
  name: string
  email: string
  currency: string
  created_at: string
  client_user_id?: string | null
  project_count?: number
  total_invoiced?: number
}

interface ClientsProps {
  openForm?: boolean
}

export const Clients: React.FC<ClientsProps> = ({ openForm = false }) => {
  const { user } = useAuth()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(openForm)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')
  const [toast, setToast] = useState<{ type: 'success' | 'error', message: string } | null>(null)
  const [invitingClientId, setInvitingClientId] = useState<string | null>(null)
  const [hasProfile, setHasProfile] = useState<boolean>(true)
  const [checkingProfile, setCheckingProfile] = useState<boolean>(true)

  useEffect(() => {
    if (user) {
      checkUserProfile()
      loadClients()
    }
  }, [user])

  const checkUserProfile = async () => {
    setCheckingProfile(true)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user!.id)
        .single()

      if (error && error.code === 'PGRST116') {
        // No profile found
        setHasProfile(false)
      } else if (error) {
        throw error
      } else {
        setHasProfile(true)
      }
    } catch (error) {
      console.error('Error checking user profile:', error)
      setHasProfile(false)
    } finally {
      setCheckingProfile(false)
    }
  }

  const loadClients = async () => {
    setLoading(true)
    try {
      // Get user's company_id
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user!.id)
        .maybeSingle()

      if (profileError) throw profileError

      if (!profile?.company_id) {
        setClients([])
        return
      }

      const { data, error } = await supabase
        .from('clients')
        .select(`
          *,
          projects (id),
          invoices (total)
        `)
        .eq('company_id', profile.company_id)
        .order('created_at', { ascending: false })

      if (error) throw error

      const clientsWithStats = data.map(client => ({
        id: client.id,
        name: client.name,
        email: client.email,
        currency: client.currency,
        created_at: client.created_at,
        client_user_id: client.client_user_id,
        project_count: client.projects?.length || 0,
        total_invoiced: client.invoices?.reduce((sum: number, invoice: any) =>
          sum + (invoice.total || 0), 0) || 0
      }))

      setClients(clientsWithStats)
    } catch (error) {
      console.error('Error loading clients:', error)
      setToast({ type: 'error', message: 'Failed to load clients.' })
    } finally {
      setLoading(false)
    }
  }

  // Updated handleInvite function with better error handling
  const handleInvite = async (client: Client, isResend: boolean = false) => {
    const confirmationMessage = isResend 
      ? `Are you sure you want to resend the portal invitation to ${client.name}?`
      : `Are you sure you want to send a portal invitation to ${client.name} at ${client.email}?`;

    if (!confirm(confirmationMessage)) {
      return;
    }

    setInvitingClientId(client.id);
    try {
      const response = await supabase.functions.invoke('invite-client-user', {
        body: {
          client_id: client.id,
          email: client.email,
          is_resend: isResend
        },
      });

      // Check if the response itself indicates an error
      if (response.error) {
        throw new Error(response.error.message || 'Failed to invoke function');
      }

      // Check if the function returned an error in the data
      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      // Success case
      const successMessage = response.data?.message || 
        (isResend ? 'Portal invitation resent successfully!' : 'Portal invitation sent successfully!');
      
      setToast({ type: 'success', message: successMessage });
      
      // Reload clients to update the UI state
      loadClients();
      
    } catch (error: any) {
      console.error('Error in invitation process:', error);
      
      // More specific error handling
      let errorMessage = 'Failed to process invitation.';
      
      if (error.message) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      setToast({ type: 'error', message: errorMessage });
    } finally {
      setInvitingClientId(null);
    }
  };

  const handleCreateClient = () => {
    if (!hasProfile) {
      setToast({ 
        type: 'error', 
        message: 'Please complete your profile in Settings before creating clients.' 
      })
      return
    }
    
    setEditingClient(null)
    setShowForm(true)
  }

  const handleEditClient = (client: Client) => {
    setEditingClient(client)
    setShowForm(true)
  }

  const handleDeleteClient = async (clientId: string) => {
    if (!confirm('Are you sure you want to delete this client? This will also delete all associated projects and invoices.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', clientId)

      if (error) throw error
      
      setToast({ type: 'success', message: 'Client deleted successfully.' })
      setClients(clients.filter(c => c.id !== clientId))
    } catch (error) {
      console.error('Error deleting client:', error)
      setToast({ type: 'error', message: 'Failed to delete client' })
    }
  }

  const handleFormSuccess = () => {
    setShowForm(false)
    setEditingClient(null)
    setToast({ type: 'success', message: editingClient ? 'Client updated successfully!' : 'Client created successfully!' })
    loadClients()
  }

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (loading || checkingProfile) {
    return (
      <Layout title="Clients" subtitle="Manage your client relationships">
        <div className="animate-pulse space-y-6">
          <div className="flex justify-between items-center">
            <div className="h-8 bg-gray-200 rounded w-64"></div>
            <div className="h-10 bg-gray-200 rounded w-32"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white p-6 rounded-lg shadow-sm h-48"></div>
            ))}
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="Clients" subtitle="Manage your client relationships">
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}
      
      {/* Profile Warning Banner */}
      {!hasProfile && (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-yellow-800 mb-1">
                Profile Setup Required
              </h3>
              <p className="text-sm text-yellow-700 mb-3">
                You need to complete your profile before you can create clients. This ensures all client records are properly linked to your account.
              </p>
              <a
                href="/settings"
                className="inline-flex items-center px-3 py-1.5 bg-yellow-600 text-white text-sm rounded-md hover:bg-yellow-700 transition-colors"
              >
                Complete Profile
              </a>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search clients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full sm:w-64"
            />
          </div>
          
          <div className="flex gap-2">
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded ${viewMode === 'list' ? 'bg-white shadow-sm' : 'text-gray-600'}`}
              >
                <List className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded ${viewMode === 'grid' ? 'bg-white shadow-sm' : 'text-gray-600'}`}
              >
                <Grid className="h-4 w-4" />
              </button>
            </div>
            <button
              onClick={handleCreateClient}
              disabled={!hasProfile}
              className={`flex items-center px-4 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors ${
                hasProfile 
                  ? 'bg-blue-600 text-white hover:bg-blue-700' 
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              <Plus className="h-4 w-4 mr-2" />
              New Client
            </button>
          </div>
        </div>

        {/* Clients Display */}
        {filteredClients.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Plus className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No clients found</h3>
            <p className="text-gray-500 mb-6">
              {searchTerm 
                ? 'Try adjusting your search criteria'
                : 'Get started by adding your first client'
              }
            </p>
            {!searchTerm && hasProfile && (
              <button
                onClick={handleCreateClient}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Client
              </button>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredClients.map((client) => (
              <ClientCard
                key={client.id}
                client={client}
                onEdit={handleEditClient}
                onDelete={handleDeleteClient}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Client
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Portal Access
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Projects
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Invoiced
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredClients.map((client) => (
                    <tr key={client.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">{client.name}</div>
                        <div className="text-sm text-gray-500">{client.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {client.client_user_id ? (
                          <button
                            onClick={() => handleInvite(client, true)}
                            disabled={invitingClientId === client.id}
                            className="flex items-center text-sm text-green-700 hover:text-green-900 disabled:opacity-50 disabled:cursor-wait"
                          >
                            <RefreshCw className={`h-3 w-3 mr-1.5 ${invitingClientId === client.id ? 'animate-spin' : ''}`}/>
                            {invitingClientId === client.id ? 'Sending...' : 'Resend Invite'}
                          </button>
                        ) : (
                          <button
                            onClick={() => handleInvite(client, false)}
                            disabled={invitingClientId === client.id}
                            className="flex items-center text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50 disabled:cursor-wait"
                          >
                            <Mail className="h-3 w-3 mr-1.5"/>
                            {invitingClientId === client.id ? 'Sending...' : 'Invite to Portal'}
                          </button>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {client.project_count}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {client.currency} {client.total_invoiced?.toLocaleString() || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleEditClient(client)}
                            className="text-blue-600 hover:text-blue-800 px-2 py-1 rounded text-sm"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteClient(client.id)}
                            className="text-red-600 hover:text-red-800 px-2 py-1 rounded text-sm"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {showForm && (
          <ClientForm
            client={editingClient}
            onSuccess={handleFormSuccess}
            onCancel={() => {
              setShowForm(false)
              setEditingClient(null)
            }}
          />
        )}
      </div>
    </Layout>
  )
}
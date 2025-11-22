import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'

// Auth Components
import { SignIn } from './components/Auth/SignIn'
import { SignUp } from './components/Auth/SignUp'

// Main Components
import { Dashboard } from './components/Dashboard/Dashboard'
import { TimeTracker } from './components/TimeTracker/TimeTracker'
import { Projects } from './components/Projects/Projects'
import { Clients } from './components/Clients/Clients'
import { Invoices } from './components/Invoices/Invoices'
import { Quotations } from './components/Quotations/Quotations'
import { Expenses } from './components/Expenses/Expenses'
import { Settings } from './components/Settings/Settings'
import { Reports } from './components/Reports/Reports'
import { PublicInvoiceView } from './components/Invoices/PublicInvoiceView'

// Client Portal Components
import { ClientSignIn } from './components/ClientPortal/ClientSignIn'
import { ClientDashboard } from './components/ClientPortal/ClientDashboard'
import { ClientInvoices } from './components/ClientPortal/ClientInvoices'
import { ClientProjects } from './components/ClientPortal/ClientProjects'
import { ClientProjectDetails } from './components/ClientPortal/ClientProjectDetails'
import { ClientTimeLogs } from './components/ClientPortal/ClientTimeLogs'
import { CompanyOnboarding } from './components/Onboarding/CompanyOnboarding'
import { ErrorBoundary } from './components/common/ErrorBoundary'

// Global Components


// Loading Component
const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
  </div>
)

// Protected Route for Freelancer App
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <LoadingSpinner />
  }

  if (!user) {
    return <Navigate to="/signin" replace />
  }

  // If user has no company_id and is not already on the onboarding page, redirect to onboarding
  if (profile && !profile.company_id && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />
  }

  // If user has company_id and tries to access onboarding, redirect to dashboard
  if (profile?.company_id && location.pathname === '/onboarding') {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}

// Protected Route for Client Portal
const ProtectedClientRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth()

  if (loading) {
    return <LoadingSpinner />
  }

  if (!user) {
    return <Navigate to="/client/signin" replace />
  }

  return <>{children}</>
}

// Public Route Component (redirects freelancer if authenticated)
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth()

  if (loading) {
    return <LoadingSpinner />
  }

  if (user) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Freelancer Public Routes */}
      <Route path="/signin" element={<PublicRoute><SignIn /></PublicRoute>} />
      <Route path="/signup" element={<PublicRoute><SignUp /></PublicRoute>} />

      {/* Client Public Routes */}
      <Route path="/client/signin" element={<ClientSignIn />} />

      {/* Other Public Routes */}
      <Route path="/invoice/public/:paymentLink" element={<PublicInvoiceView />} />

      {/* Protected Routes - Freelancer */}
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/time-tracker" element={<ProtectedRoute><TimeTracker /></ProtectedRoute>} />
      <Route path="/projects" element={<ProtectedRoute><Projects /></ProtectedRoute>} />
      <Route path="/projects/new" element={<ProtectedRoute><Projects openForm={true} /></ProtectedRoute>} />
      <Route path="/clients" element={<ProtectedRoute><Clients /></ProtectedRoute>} />
      <Route path="/clients/new" element={<ProtectedRoute><Clients openForm={true} /></ProtectedRoute>} />
      <Route path="/invoices" element={<ProtectedRoute><Invoices /></ProtectedRoute>} />
      <Route path="/invoices/new" element={<ProtectedRoute><Invoices openForm={true} /></ProtectedRoute>} />
      <Route path="/quotations" element={<ProtectedRoute><Quotations /></ProtectedRoute>} />
      <Route path="/quotations/new" element={<ProtectedRoute><Quotations openForm={true} /></ProtectedRoute>} />
      <Route path="/expenses" element={<ProtectedRoute><Expenses /></ProtectedRoute>} />
      <Route path="/expenses/new" element={<ProtectedRoute><Expenses openForm={true} /></ProtectedRoute>} />
      <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />

      {/* Protected Routes - Client */}
      <Route path="/client/dashboard" element={<ProtectedClientRoute><ClientDashboard /></ProtectedClientRoute>} />
      <Route path="/client/invoices" element={<ProtectedClientRoute><ClientInvoices /></ProtectedClientRoute>} />
      <Route path="/client/projects" element={<ProtectedClientRoute><ClientProjects /></ProtectedClientRoute>} />
      <Route path="/client/projects/:projectId" element={<ProtectedClientRoute><ClientProjectDetails /></ProtectedClientRoute>} />
      <Route path="/client/time-logs" element={<ProtectedClientRoute><ClientTimeLogs /></ProtectedClientRoute>} />

      {/* Onboarding Route */}
      <Route path="/onboarding" element={<ProtectedRoute><CompanyOnboarding /></ProtectedRoute>} />

      {/* Redirect root to freelancer dashboard */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* 404 fallback */}
      <Route path="*" element={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">404</h1>
            <p className="text-gray-600">Page not found</p>
          </div>
        </div>
      } />
    </Routes>
  )
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <div className="relative">
            <AppRoutes />
          </div>
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App

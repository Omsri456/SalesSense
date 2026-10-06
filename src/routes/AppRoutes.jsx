import { Routes, Route } from 'react-router-dom'
import Landing from '../pages/Landing'
import Dashboard from '../pages/Dashboard'
import DatasetUpload from '../pages/DatasetUpload'
import Login from '../pages/Login'
import Register from '../pages/Register'
import ForgotPassword from '../pages/ForgotPassword'
import Inventory from '../pages/Inventory'
import Forecast from '../pages/Forecast'
import Models from '../pages/Models'
import Reports from '../pages/Reports'
import Profile from '../pages/Profile'
import Settings from '../pages/Settings'
import ProtectedRoute from './ProtectedRoute'

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public Pages */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />

      {/* General Authenticated Core Views */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/forecast"
        element={
          <ProtectedRoute>
            <Forecast />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedRoute>
            <Reports />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        }
      />

      {/* Role Restricted: ML Engineer & Admin */}
      <Route
        path="/datasets"
        element={
          <ProtectedRoute allowedRoles={['admin', 'ml_engineer']}>
            <DatasetUpload />
          </ProtectedRoute>
        }
      />
      <Route
        path="/models"
        element={
          <ProtectedRoute allowedRoles={['admin', 'ml_engineer']}>
            <Models />
          </ProtectedRoute>
        }
      />
      <Route
        path="/comparison"
        element={
          <ProtectedRoute allowedRoles={['admin', 'ml_engineer']}>
            <Models />
          </ProtectedRoute>
        }
      />

      {/* Role Restricted: Store / Inventory Manager & Admin */}
      <Route
        path="/inventory"
        element={
          <ProtectedRoute allowedRoles={['admin', 'retailer']}>
            <Inventory />
          </ProtectedRoute>
        }
      />
      <Route
        path="/alerts"
        element={
          <ProtectedRoute allowedRoles={['admin', 'retailer']}>
            <Inventory />
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}

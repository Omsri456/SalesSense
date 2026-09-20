import { Routes, Route } from 'react-router-dom'
import Landing from '../pages/Landing'
import Dashboard from '../pages/Dashboard'
import DatasetUpload from '../pages/DatasetUpload'
import Login from '../pages/Login'
import Register from '../pages/Register'
import ForgotPassword from '../pages/ForgotPassword'
import ComingSoon from '../pages/ComingSoon'
import Inventory from '../pages/Inventory'
import Forecast from '../pages/Forecast'
import Models from '../pages/Models'
import Reports from '../pages/Reports'

// Landing, auth, Dashboard, Datasets, Inventory, Forecast, Models, and
// Reports are fully built. Remaining routes from the spec are scaffolded
// here so navigation and folder structure are ready for the next pass.
export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/datasets" element={<DatasetUpload />} />
      <Route path="/preprocessing" element={<ComingSoon title="Data preprocessing" />} />
      <Route path="/models" element={<Models />} />
      <Route path="/forecast" element={<Forecast />} />
      <Route path="/comparison" element={<ComingSoon title="Model comparison" />} />
      <Route path="/products" element={<ComingSoon title="Product forecasting" />} />
      <Route path="/inventory" element={<Inventory />} />
      <Route path="/alerts" element={<ComingSoon title="Alerts" />} />
      <Route path="/reports" element={<Reports />} />
      <Route path="/settings" element={<ComingSoon title="Settings" />} />
      <Route path="/profile" element={<ComingSoon title="Profile" />} />
    </Routes>
  )
}

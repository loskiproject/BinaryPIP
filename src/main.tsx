import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import AdminDashboard from './admin/AdminDashboard.tsx'

// Route to admin portal if URL path starts with /admin
// This keeps the admin portal completely invisible from the main app —
// no link, no nav item, no reference in App.tsx whatsoever.
const isAdminRoute = window.location.pathname.startsWith('/admin')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isAdminRoute ? <AdminDashboard /> : <App />}
  </StrictMode>,
)

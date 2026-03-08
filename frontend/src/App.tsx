import { Suspense, lazy } from "react"
import { BrowserRouter, Routes, Route } from "react-router-dom"
import { AuthProvider } from "@/context/AuthContext"
import ProtectedRoute from "@/components/ProtectedRoute"
import LoginPage from "@/pages/LoginPage"
import SignupPage from "@/pages/SignupPage"
import LandingPage from "@/components/LandingPage"
import LandingNavbar from "@/components/ui/LandingNavbar"
import NotFoundPage from "@/pages/NotFoundPage"

const DashboardLayout = lazy(() => import("@/pages/dashboard/DashboardLayout"))

const DashboardFallback = () => (
  <div className="flex items-center justify-center h-screen">
    <span className="font-mono text-xs text-muted-foreground uppercase tracking-widest">Loading...</span>
  </div>
)

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<DashboardFallback />}>
          <Routes>
            {/* Landing page */}
            <Route path="/" element={
              <>
                <LandingNavbar />
                <LandingPage />
              </>
            } />

            {/* Public auth routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />

            {/* Protected dashboard */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            />

            {/* 404 */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  )
}


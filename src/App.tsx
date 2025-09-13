import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { RealtimeProvider } from "@/components/realtime/RealtimeProvider";
import EnhancedErrorBoundary from "@/components/common/EnhancedErrorBoundary";
import ProtectedRoute from "./components/ProtectedRoute";
import { createLazyRoute, RoutePreloader } from "@/components/common/LazyRoute";

// Critical pages (loaded immediately)
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";

// Lazy loaded pages with performance optimizations and appropriate fallbacks
const Home = createLazyRoute(() => import("./pages/Home"), { fallback: 'Dashboard', preload: true });
const Dashboard = createLazyRoute(() => import("./pages/Dashboard"), { fallback: 'Dashboard' });
const Yearbooks = createLazyRoute(() => import("./pages/Yearbooks"), { fallback: 'Page' });
const YearbookUpload = createLazyRoute(() => import("./pages/YearbookUpload"), { fallback: 'Card' });
const YearbookReader = createLazyRoute(() => import("./pages/YearbookReader"), { fallback: 'Page' });
const Events = createLazyRoute(() => import("./pages/EventsSimple"), { fallback: 'List' });
const CreateEvent = createLazyRoute(() => import("./pages/CreateEvent"), { fallback: 'Card' });
const Businesses = createLazyRoute(() => import("./pages/BusinessesSimple"), { fallback: 'List' });
const CreateBusiness = createLazyRoute(() => import("./pages/CreateBusiness"), { fallback: 'Card' });
const Jobs = createLazyRoute(() => import("./pages/JobsSimple"), { fallback: 'List' });
const JobDetail = createLazyRoute(() => import("./pages/JobDetail"), { fallback: 'Page' });
const Mentorship = createLazyRoute(() => import("./pages/Mentorship"), { fallback: 'List' });
const Notifications = createLazyRoute(() => import("./pages/Notifications"), { fallback: 'List' });
const Alumni = createLazyRoute(() => import("./pages/Alumni"), { fallback: 'List' });
const Network = createLazyRoute(() => import("./pages/Network"), { fallback: 'List' });
const Messages = createLazyRoute(() => import("./pages/Messages"), { fallback: 'List' });
const Channels = createLazyRoute(() => import("./pages/Channels"), { fallback: 'List' });
const Schools = createLazyRoute(() => import("./pages/Schools"), { fallback: 'List' });
const Social = createLazyRoute(() => import("./pages/Social"), { fallback: 'Dashboard' });
const Profile = createLazyRoute(() => import("./pages/Profile"), { fallback: 'Page' });
const Settings = createLazyRoute(() => import("./pages/Settings"), { fallback: 'Page' });
const Admin = createLazyRoute(() => import("./pages/Admin"), { fallback: 'Dashboard' });
const SchoolPage = createLazyRoute(() => import("./pages/SchoolPage"), { fallback: 'Page' });
const Groups = createLazyRoute(() => import("./pages/Groups"), { fallback: 'List' });
const CreateGroup = createLazyRoute(() => import("./pages/CreateGroup"), { fallback: 'Card' });
const GroupDetail = createLazyRoute(() => import("./pages/GroupDetail"), { fallback: 'Page' });
const FaceSearch = createLazyRoute(() => import("./pages/FaceSearch"), { fallback: 'Page' });
const MentorshipProfile = createLazyRoute(() => import("./pages/MentorshipProfile"), { fallback: 'Page' });
const MentorshipDashboard = createLazyRoute(() => import("./pages/MentorshipDashboard"), { fallback: 'Dashboard' });
const AlumniPerks = createLazyRoute(() => import("./pages/AlumniPerks"), { fallback: 'List' });
const PremiumSubscription = createLazyRoute(() => import("./pages/PremiumSubscription"), { fallback: 'Card' });

// Enhanced QueryClient with optimized defaults
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      retry: (failureCount, error: any) => {
        // Don't retry on certain errors
        if (error?.status === 404 || error?.status === 403) return false;
        return failureCount < 3;
      },
      refetchOnWindowFocus: false,
      refetchOnReconnect: 'always',
    },
    mutations: {
      retry: false, // Don't retry mutations by default
    },
  },
});

// Preload critical routes on app initialization
if (typeof window !== 'undefined') {
  // Preload dashboard after login page loads
  setTimeout(() => {
    RoutePreloader.preload(() => import("./pages/Home"));
    RoutePreloader.preload(() => import("./pages/Events"));
  }, 1000);
}

const App = () => (
  <EnhancedErrorBoundary level="page" showReportButton maxRetries={3}>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RealtimeProvider>
          <TooltipProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />

                {/* Main Dashboard */}
                <Route path="/dashboard" element={
                  <ProtectedRoute>
                    <Home />
                  </ProtectedRoute>
                } />

                {/* Yearbooks */}
                <Route path="/yearbooks" element={
                  <ProtectedRoute>
                    <Yearbooks />
                  </ProtectedRoute>
                } />
                <Route path="/yearbooks/upload" element={
                  <ProtectedRoute>
                    <YearbookUpload />
                  </ProtectedRoute>
                } />
                <Route path="/yearbooks/claim" element={
                  <ProtectedRoute>
                    <FaceSearch />
                  </ProtectedRoute>
                } />
                <Route path="/yearbooks/:id" element={
                  <ProtectedRoute>
                    <YearbookReader />
                  </ProtectedRoute>
                } />
                <Route path="/yearbooks/:schoolSlug/:year" element={
                  <ProtectedRoute>
                    <Yearbooks />
                  </ProtectedRoute>
                } />

                {/* Events */}
                <Route path="/events" element={
                  <ProtectedRoute>
                    <Events />
                  </ProtectedRoute>
                } />
                <Route path="/events/create" element={
                  <ProtectedRoute>
                    <CreateEvent />
                  </ProtectedRoute>
                } />
                <Route path="/events/:eventId" element={
                  <ProtectedRoute>
                    <Events />
                  </ProtectedRoute>
                } />

                {/* Businesses */}
                <Route path="/businesses" element={
                  <ProtectedRoute>
                    <Businesses />
                  </ProtectedRoute>
                } />
                <Route path="/businesses/create" element={
                  <ProtectedRoute>
                    <CreateBusiness />
                  </ProtectedRoute>
                } />
                <Route path="/businesses/:listingId" element={
                  <ProtectedRoute>
                    <Businesses />
                  </ProtectedRoute>
                } />

                {/* Jobs */}
                <Route path="/jobs" element={
                  <ProtectedRoute>
                    <Jobs />
                  </ProtectedRoute>
                } />
                <Route path="/jobs/create" element={
                  <ProtectedRoute>
                    <Jobs />
                  </ProtectedRoute>
                } />
                <Route path="/jobs/:jobId" element={
                  <ProtectedRoute>
                    <JobDetail />
                  </ProtectedRoute>
                } />

                {/* Mentorship */}
                <Route path="/mentorship" element={
                  <ProtectedRoute>
                    <Mentorship />
                  </ProtectedRoute>
                } />
                <Route path="/mentorship/profile" element={
                  <ProtectedRoute>
                    <MentorshipProfile />
                  </ProtectedRoute>
                } />
                <Route path="/mentorship/dashboard" element={
                  <ProtectedRoute>
                    <MentorshipDashboard />
                  </ProtectedRoute>
                } />

                {/* Social & Communication */}
                <Route path="/alumni" element={
                  <ProtectedRoute>
                    <Alumni />
                  </ProtectedRoute>
                } />
                <Route path="/network" element={
                  <ProtectedRoute>
                    <Network />
                  </ProtectedRoute>
                } />
                <Route path="/messages" element={
                  <ProtectedRoute>
                    <Messages />
                  </ProtectedRoute>
                } />
                <Route path="/messages/:threadId" element={
                  <ProtectedRoute>
                    <Messages />
                  </ProtectedRoute>
                } />
                <Route path="/channels" element={
                  <ProtectedRoute>
                    <Channels />
                  </ProtectedRoute>
                } />
                <Route path="/social" element={
                  <ProtectedRoute>
                    <Social />
                  </ProtectedRoute>
                } />
                <Route path="/notifications" element={
                  <ProtectedRoute>
                    <Notifications />
                  </ProtectedRoute>
                } />

                {/* Groups */}
                <Route path="/groups" element={
                  <ProtectedRoute>
                    <Groups />
                  </ProtectedRoute>
                } />
                <Route path="/groups/create" element={
                  <ProtectedRoute>
                    <CreateGroup />
                  </ProtectedRoute>
                } />
                <Route path="/groups/:id" element={
                  <ProtectedRoute>
                    <GroupDetail />
                  </ProtectedRoute>
                } />

                {/* Schools */}
                <Route path="/schools" element={
                  <ProtectedRoute>
                    <Schools />
                  </ProtectedRoute>
                } />
                <Route path="/schools/:slug" element={
                  <ProtectedRoute>
                    <SchoolPage />
                  </ProtectedRoute>
                } />
                <Route path="/schools/:schoolSlug/classes/:year" element={
                  <ProtectedRoute>
                    <Schools />
                  </ProtectedRoute>
                } />

                {/* Profile & Settings */}
                <Route path="/profile" element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                } />
                <Route path="/u/:username" element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                } />
                <Route path="/settings" element={
                  <ProtectedRoute>
                    <Settings />
                  </ProtectedRoute>
                } />
                <Route path="/verify" element={
                  <ProtectedRoute>
                    <Settings />
                  </ProtectedRoute>
                } />

                {/* Perks & Subscription */}
                <Route path="/perks" element={
                  <ProtectedRoute>
                    <AlumniPerks />
                  </ProtectedRoute>
                } />
                <Route path="/subscription" element={
                  <ProtectedRoute>
                    <PremiumSubscription />
                  </ProtectedRoute>
                } />

                {/* Admin */}
                <Route path="/admin" element={
                  <ProtectedRoute>
                    <Admin />
                  </ProtectedRoute>
                } />

                {/* Redirects */}
                <Route path="/create/post" element={<Navigate to="/dashboard" replace />} />

                {/* Catch-all 404 route - MUST be last */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </RealtimeProvider>
      </AuthProvider>
    </QueryClientProvider>
  </EnhancedErrorBoundary>
);

export default App;
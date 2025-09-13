import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { RealtimeProvider } from "@/components/realtime/RealtimeProvider";
import EnhancedErrorBoundary from "@/components/common/EnhancedErrorBoundary";
import ProtectedRoute from "./components/ProtectedRoute";
import { createLazyRoute, RoutePreloader } from "@/components/common/LazyRoute";
import { Suspense } from "react";

// Critical pages (loaded immediately)
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";

// Lazy loaded pages with performance optimizations
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
      gcTime: 10 * 60 * 1000, // 10 minutes
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
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <Home />
                </ProtectedRoute>
              } />
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
                  <Suspense fallback={<PageSkeleton />}>
                    <Yearbooks />
                  </Suspense>
                </ProtectedRoute>
              } />
              <Route path="/events" element={
                <ProtectedRoute>
                  <Suspense fallback={<PageSkeleton />}>
                    <Events />
                  </Suspense>
                </ProtectedRoute>
              } />
              <Route path="/businesses" element={
                <ProtectedRoute>
                  <Suspense fallback={<PageSkeleton />}>
                    <Businesses />
                  </Suspense>
                </ProtectedRoute>
              } />
              <Route path="/jobs" element={
                <ProtectedRoute>
                  <Suspense fallback={<PageSkeleton />}>
                    <Jobs />
                  </Suspense>
                </ProtectedRoute>
              } />
              <Route path="/mentorship" element={
                <ProtectedRoute>
                  <Suspense fallback={<PageSkeleton />}>
                    <Mentorship />
                  </Suspense>
                </ProtectedRoute>
              } />
              <Route path="/mentorship/profile" element={
                <ProtectedRoute>
                  <Suspense fallback={<PageSkeleton />}>
                    <MentorshipProfile />
                  </Suspense>
                </ProtectedRoute>
              } />
              <Route path="/mentorship/dashboard" element={
                <ProtectedRoute>
                  <Suspense fallback={<PageSkeleton />}>
                    <MentorshipDashboard />
                  </Suspense>
                </ProtectedRoute>
              } />
              <Route path="/notifications" element={
                <ProtectedRoute>
                  <Suspense fallback={<PageSkeleton />}>
                    <Notifications />
                  </Suspense>
                </ProtectedRoute>
              } />
              {/* Create Routes */}
              <Route path="/events/create" element={
                <ProtectedRoute>
                  <Suspense fallback={<PageSkeleton />}>
                    <CreateEvent />
                  </Suspense>
                </ProtectedRoute>
              } />
              <Route path="/events/:eventId" element={
                <ProtectedRoute>
                  <Suspense fallback={<PageSkeleton />}>
                    <Events />
                  </Suspense>
                </ProtectedRoute>
              } />
              <Route path="/businesses/create" element={
                <ProtectedRoute>
                  <Suspense fallback={<PageSkeleton />}>
                    <CreateBusiness />
                  </Suspense>
                </ProtectedRoute>
              } />
              <Route path="/businesses/:listingId" element={
                <ProtectedRoute>
                  <Suspense fallback={<PageSkeleton />}>
                    <Businesses />
                  </Suspense>
                </ProtectedRoute>
              } />
              <Route path="/jobs/create" element={
                <ProtectedRoute>
                  <Suspense fallback={<PageSkeleton />}>
                    <Jobs />
                  </Suspense>
                </ProtectedRoute>
              } />
              <Route path="/jobs/:jobId" element={
                <ProtectedRoute>
                  <Suspense fallback={<PageSkeleton />}>
                    <JobDetail />
                  </Suspense>
                </ProtectedRoute>
              } />
              <Route path="/create/post" element={<Navigate to="/dashboard" replace />} />
              <Route path="/groups" element={
                <ProtectedRoute>
                  <Suspense fallback={<PageSkeleton />}>
                    <Groups />
                  </Suspense>
                </ProtectedRoute>
              } />
              <Route path="/groups/create" element={
                <ProtectedRoute>
                  <Suspense fallback={<PageSkeleton />}>
                    <CreateGroup />
                  </Suspense>
                </ProtectedRoute>
              } />
              <Route path="/groups/:id" element={
                <ProtectedRoute>
                  <Suspense fallback={<PageSkeleton />}>
                    <GroupDetail />
                  </Suspense>
                </ProtectedRoute>
              } />
              <Route path="/alumni" element={
                <ProtectedRoute>
                  <Suspense fallback={<PageSkeleton />}>
                    <Alumni />
                  </Suspense>
                </ProtectedRoute>
              } />
              <Route path="/network" element={
                <ProtectedRoute>
                  <Suspense fallback={<PageSkeleton />}>
                    <Network />
                  </Suspense>
                </ProtectedRoute>
              } />
              <Route path="/messages" element={
                <ProtectedRoute>
                  <Suspense fallback={<PageSkeleton />}>
                    <Messages />
                  </Suspense>
                </ProtectedRoute>
              } />
              <Route path="/messages/:threadId" element={
                <ProtectedRoute>
                  <Suspense fallback={<PageSkeleton />}>
                    <Messages />
                  </Suspense>
                </ProtectedRoute>
              } />
              <Route path="/channels" element={
                <ProtectedRoute>
                  <Suspense fallback={<PageSkeleton />}>
                    <Channels />
                  </Suspense>
                </ProtectedRoute>
              } />
              <Route path="/schools" element={
                <ProtectedRoute>
                  <Suspense fallback={<PageSkeleton />}>
                    <Schools />
                  </Suspense>
                </ProtectedRoute>
              } />
              <Route path="/social" element={
                <ProtectedRoute>
                  <Suspense fallback={<PageSkeleton />}>
                    <Social />
                  </Suspense>
                </ProtectedRoute>
              } />
              <Route path="/profile" element={
                <ProtectedRoute>
                  <Suspense fallback={<PageSkeleton />}>
                    <Profile />
                  </Suspense>
                </ProtectedRoute>
              } />
              <Route path="/u/:username" element={
                <ProtectedRoute>
                  <Suspense fallback={<PageSkeleton />}>
                    <Profile />
                  </Suspense>
                </ProtectedRoute>
              } />
              <Route path="/settings" element={
                <ProtectedRoute>
                  <Suspense fallback={<PageSkeleton />}>
                    <Settings />
                  </Suspense>
                </ProtectedRoute>
              } />
              <Route path="/verify" element={
                <ProtectedRoute>
                  <Suspense fallback={<PageSkeleton />}>
                    <Settings />
                  </Suspense>
                </ProtectedRoute>
              } />
              <Route path="/admin" element={
                <ProtectedRoute>
                  <Suspense fallback={<PageSkeleton />}>
                    <Admin />
                  </Suspense>
                </ProtectedRoute>
              } />
              <Route path="/schools/:slug" element={
                <ProtectedRoute>
                  <Suspense fallback={<PageSkeleton />}>
                    <SchoolPage />
                  </Suspense>
                </ProtectedRoute>
              } />
              <Route path="/schools/:schoolSlug/classes/:year" element={
                <ProtectedRoute>
                  <Suspense fallback={<PageSkeleton />}>
                    <Schools />
                  </Suspense>
                </ProtectedRoute>
              } />
              <Route path="/perks" element={
                <ProtectedRoute>
                  <Suspense fallback={<PageSkeleton />}>
                    <AlumniPerks />
                  </Suspense>
                </ProtectedRoute>
              } />
              <Route path="/subscription" element={
                <ProtectedRoute>
                  <Suspense fallback={<PageSkeleton />}>
                    <PremiumSubscription />
                  </Suspense>
                </ProtectedRoute>
              } />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
            </TooltipProvider>
        </RealtimeProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
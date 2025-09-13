import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { RealtimeProvider } from "@/components/realtime/RealtimeProvider";
import ErrorBoundary from "@/components/ErrorBoundary";
import ProtectedRoute from "./components/ProtectedRoute";
import { lazy, Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

// Critical pages (loaded immediately)
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";

// Lazy loaded pages (loaded on demand)
const Home = lazy(() => import("./pages/Home"));
const Dashboard = lazy(() => import("./pages/Dashboard")); // Keep old dashboard for reference
const Yearbooks = lazy(() => import("./pages/Yearbooks"));
const YearbookUpload = lazy(() => import("./pages/YearbookUpload"));
const YearbookReader = lazy(() => import("./pages/YearbookReader"));
const Events = lazy(() => import("./pages/EventsSimple"));
const CreateEvent = lazy(() => import("./pages/CreateEvent"));
const Businesses = lazy(() => import("./pages/BusinessesSimple"));
const CreateBusiness = lazy(() => import("./pages/CreateBusiness"));
const Jobs = lazy(() => import("./pages/JobsSimple"));
const JobDetail = lazy(() => import("./pages/JobDetail"));
const Mentorship = lazy(() => import("./pages/Mentorship"));
const Notifications = lazy(() => import("./pages/Notifications"));
const Alumni = lazy(() => import("./pages/Alumni"));
const Network = lazy(() => import("./pages/Network"));
const Messages = lazy(() => import("./pages/Messages"));
const Channels = lazy(() => import("./pages/Channels"));
const Schools = lazy(() => import("./pages/Schools"));
const Social = lazy(() => import("./pages/Social"));
const Profile = lazy(() => import("./pages/Profile"));
const Settings = lazy(() => import("./pages/Settings"));
const Admin = lazy(() => import("./pages/Admin"));
const SchoolPage = lazy(() => import("./pages/SchoolPage"));
const Groups = lazy(() => import("./pages/Groups"));
const CreateGroup = lazy(() => import("./pages/CreateGroup"));
const GroupDetail = lazy(() => import("./pages/GroupDetail"));
const FaceSearch = lazy(() => import("./pages/FaceSearch"));
const MentorshipProfile = lazy(() => import("./pages/MentorshipProfile"));
const MentorshipDashboard = lazy(() => import("./pages/MentorshipDashboard"));
const AlumniPerks = lazy(() => import("./pages/AlumniPerks"));
const PremiumSubscription = lazy(() => import("./pages/PremiumSubscription"));

// Loading fallback component
const PageSkeleton = () => (
  <div className="min-h-screen flex flex-col">
    <div className="p-6 space-y-4">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-96" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ))}
      </div>
    </div>
  </div>
);

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
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
                  <Suspense fallback={<PageSkeleton />}>
                    <Home />
                  </Suspense>
                </ProtectedRoute>
              } />
              <Route path="/yearbooks" element={
                <ProtectedRoute>
                  <Suspense fallback={<PageSkeleton />}>
                    <Yearbooks />
                  </Suspense>
                </ProtectedRoute>
              } />
              <Route path="/yearbooks/upload" element={
                <ProtectedRoute>
                  <Suspense fallback={<PageSkeleton />}>
                    <YearbookUpload />
                  </Suspense>
                </ProtectedRoute>
              } />
              <Route path="/yearbooks/claim" element={
                <ProtectedRoute>
                  <Suspense fallback={<PageSkeleton />}>
                    <FaceSearch />
                  </Suspense>
                </ProtectedRoute>
              } />
              <Route path="/yearbooks/:id" element={
                <ProtectedRoute>
                  <Suspense fallback={<PageSkeleton />}>
                    <YearbookReader />
                  </Suspense>
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
import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ErrorBoundary } from 'react-error-boundary';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

// Core Pages (Keep these as regular imports for better UX)
import Home from './pages/Home';
import NotFound from './pages/NotFound';


import { defineCustomElements } from '@ionic/pwa-elements/loader';
defineCustomElements(window);

// Lazy load secondary pages for better performance
const Flights = lazy(() => import('./pages/Flights'));
const BoardingPass = lazy(() => import('./pages/BoardingPass'));
const WaitTimes = lazy(() => import('./pages/WaitTimes'));
const Map = lazy(() => import('./pages/Map'));
const More = lazy(() => import('./pages/More'));

// ✅ FIXED: Import with default export wrapper
const UnifiedPassportScanner = lazy(() => 
  import('@/components/passport/UnifiedPassportScanner').then(module => ({
    default: module.default
  }))
);

const ComprehensiveIdentityVerification = lazy(() => 
  import('@/components/passport/ComprehensiveIdentityVerification').then(module => ({
    default: module.default
  }))
);

// ==============================================================================
// LOADING COMPONENT
// ==============================================================================
const LoadingSpinner: React.FC = () => (
  <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
    <p className="mt-4 text-slate-600 font-medium">Loading...</p>
    <p className="mt-2 text-sm text-slate-500">Initializing professional components</p>
  </div>
);

// ==============================================================================
// ERROR FALLBACK COMPONENT (WITH PROPER TYPING)
// ==============================================================================
interface ErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

const ErrorFallback: React.FC<ErrorFallbackProps> = ({ 
  error, 
  resetErrorBoundary 
}) => (
  <div className="flex items-center justify-center min-h-screen bg-slate-50">
    <Card className="w-full max-w-md mx-4">
      <CardContent className="pt-6 text-center">
        <div className="text-6xl mb-4">⚠️</div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Something went wrong</h2>
        <p className="text-slate-600 mb-6">
          {error?.message || 'An unexpected error occurred'}
        </p>
        <Button onClick={resetErrorBoundary} className="w-full">
          Try Again
        </Button>
      </CardContent>
    </Card>
  </div>
);

// ==============================================================================
// ROUTE GUARD COMPONENT (FOR FUTURE AUTHENTICATION)
// ==============================================================================
interface RouteGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
}

const RouteGuard: React.FC<RouteGuardProps> = ({ 
  children, 
  requireAuth = false 
}) => {
  // For future: Add authentication logic here
  return <>{children}</>;
};

// ==============================================================================
// PAGE TRANSITION WRAPPER
// ==============================================================================
interface PageTransitionProps {
  children: React.ReactNode;
  pathname: string;
}

const PageTransition: React.FC<PageTransitionProps> = ({
  children,
  pathname
}) => (
  <div key={pathname} className="animate-in fade-in duration-200">
    {children}
  </div>
);

// ==============================================================================
// MAIN APP COMPONENT
// ==============================================================================
const App: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onReset={() => {
        window.location.reload();
      }}
    >
      <Routes>
        {/* 🏠 CORE ROUTES - Always Available */}
        <Route 
          path="/" 
          element={
            <PageTransition pathname={location.pathname}>
              <Home />
            </PageTransition>
          } 
        />
        
        {/* 📱 AIRPORT APP ROUTES - Lazy Loaded */}
        <Route 
          path="/flights" 
          element={
            <Suspense fallback={<LoadingSpinner />}>
              <PageTransition pathname={location.pathname}>
                <RouteGuard>
                  <Flights />
                </RouteGuard>
              </PageTransition>
            </Suspense>
          } 
        />
        
        
        
        <Route 
          path="/boarding-pass" 
          element={
            <Suspense fallback={<LoadingSpinner />}>
              <PageTransition pathname={location.pathname}>
                <RouteGuard>
                  <BoardingPass />
                </RouteGuard>
              </PageTransition>
            </Suspense>
          } 
        />
        
        <Route 
          path="/wait-times" 
          element={
            <Suspense fallback={<LoadingSpinner />}>
              <PageTransition pathname={location.pathname}>
                <RouteGuard>
                  <WaitTimes />
                </RouteGuard>
              </PageTransition>
            </Suspense>
          } 
        />
        
        <Route 
          path="/map" 
          element={
            <Suspense fallback={<LoadingSpinner />}>
              <PageTransition pathname={location.pathname}>
                <RouteGuard>
                  <Map />
                </RouteGuard>
              </PageTransition>
            </Suspense>
          } 
        />
        
        <Route 
          path="/more" 
          element={
            <Suspense fallback={<LoadingSpinner />}>
              <PageTransition pathname={location.pathname}>
                <RouteGuard>
                  <More />
                </RouteGuard>
              </PageTransition>
            </Suspense>
          } 
        />
        
        {/* 🔐 IDENTITY VERIFICATION ROUTES - Professional Features */}
        <Route 
          path="/identity-verification" 
          element={
            <Suspense fallback={<LoadingSpinner />}>
              <PageTransition pathname={location.pathname}>
                <RouteGuard>
                  <ComprehensiveIdentityVerification />
                </RouteGuard>
              </PageTransition>
            </Suspense>
          } 
        />
        
        <Route 
          path="/enroll" 
          element={
            <Suspense fallback={<LoadingSpinner />}>
              <PageTransition pathname={location.pathname}>
                <RouteGuard>
                  <ComprehensiveIdentityVerification />
                </RouteGuard>
              </PageTransition>
            </Suspense>
          } 
        />
        
        {/* 🔗 WORKFLOW ROUTES */}
        <Route 
          path="/verify" 
          element={<Navigate to="/identity-verification" replace />} 
        />
        
        <Route 
          path="/complete-verification" 
          element={
            <Suspense fallback={<LoadingSpinner />}>
              <PageTransition pathname={location.pathname}>
                <RouteGuard>
                  <ComprehensiveIdentityVerification />
                </RouteGuard>
              </PageTransition>
            </Suspense>
          } 
        />
        
        {/* 🔗 ALIASES */}
        <Route 
          path="/passport-scanner" 
          element={
            <Suspense fallback={<LoadingSpinner />}>
              <PageTransition pathname={location.pathname}>
                <UnifiedPassportScanner 
                  onScanSuccess={(result) => {
  navigate('/identity-verification', { state: { passportData: result } }); // <-- FIX
}}
                />
              </PageTransition>
            </Suspense>
          } 
        />
        
        <Route path="/scan" element={<Navigate to="/passport-scanner" replace />} />
        <Route path="/enrol" element={<Navigate to="/enroll" replace />} />
        <Route path="/enrolment" element={<Navigate to="/enroll" replace />} />
        <Route path="/smartpath" element={<Navigate to="/enroll" replace />} />
        <Route path="/propass" element={<Navigate to="/enroll" replace />} />
        <Route path="/identity" element={<Navigate to="/identity-verification" replace />} />
        <Route path="/verification" element={<Navigate to="/identity-verification" replace />} />
        
        {/* 🚫 CATCH ALL - 404 Not Found */}
        <Route 
          path="*" 
          element={
            <PageTransition pathname={location.pathname}>
              <NotFound />
            </PageTransition>
          } 
        />
      </Routes>
    </ErrorBoundary>
  );
};

export default App;

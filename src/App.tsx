import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ErrorBoundary } from 'react-error-boundary';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

// Core Pages (Keep these as regular imports for better UX)
import Home from './pages/Home';
import NotFound from './pages/NotFound';
import UltimateLivenessDetector from './components/liveness/UltimateLivenessDetector';
import { defineCustomElements } from '@ionic/pwa-elements/loader';
defineCustomElements(window);

// Lazy load secondary pages for better performance
const Flights = lazy(() => import('./pages/Flights'));
const BoardingPass = lazy(() => import('./pages/BoardingPass'));
const WaitTimes = lazy(() => import('./pages/WaitTimes'));
const Map = lazy(() => import('./pages/Map'));
const More = lazy(() => import('./pages/More'));

// Lazy load scanning and identity components (heavy components)
const UnifiedPassportScanner = lazy(() => import('@/components/passport/UnifiedPassportScanner'));
const ComprehensiveIdentityVerification = lazy(() => import('@/components/passport/ComprehensiveIdentityVerification'));

// ============================================================================
// LOADING COMPONENT
// ============================================================================
const LoadingSpinner: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
    <div className="flex flex-col items-center space-y-4">
      <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-lg font-medium text-gray-700">Loading...</p>
      <p className="text-sm text-gray-500">Initializing professional components</p>
    </div>
  </div>
);

// ============================================================================
// ERROR FALLBACK COMPONENT (WITH PROPER TYPING)
// ============================================================================
interface ErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

const ErrorFallback: React.FC<ErrorFallbackProps> = ({ 
  error, 
  resetErrorBoundary 
}) => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
    <Card className="w-full max-w-md">
      <CardContent className="pt-6">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="text-6xl">⚠️</div>
          <h2 className="text-2xl font-bold">Something went wrong</h2>
          <p className="text-muted-foreground">
            {error?.message || 'An unexpected error occurred'}
          </p>
          <Button onClick={resetErrorBoundary}>Try again</Button>
        </div>
      </CardContent>
    </Card>
  </div>
);

// ============================================================================
// ROUTE GUARD COMPONENT (FOR FUTURE AUTHENTICATION)
// ============================================================================
interface RouteGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
}

const RouteGuard: React.FC<RouteGuardProps> = ({ 
  children, 
  requireAuth = false 
}) => {
  // For future: Add authentication logic here
  // const isAuthenticated = useAuth();
  // if (requireAuth && !isAuthenticated) {
  //   return <Navigate to="/login" replace />;
  // }
  
  return <>{children}</>;
};

// ============================================================================
// PAGE TRANSITION WRAPPER (SIMPLIFIED, WITHOUT FRAMER-MOTION)
// ============================================================================
interface PageTransitionProps {
  children: React.ReactNode;
  pathname: string;
}

const PageTransition: React.FC<PageTransitionProps> = ({
  children,
  pathname
}) => (
  <div key={pathname}>
    {children}
  </div>
);

// ============================================================================
// MAIN APP COMPONENT
// ============================================================================
const App: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onReset={() => {
        // Clear any error state or reload the page
        window.location.reload();
      }}
    >
      <Routes location={location} key={location.pathname}>
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
            <RouteGuard>
              <PageTransition pathname={location.pathname}>
                <Suspense fallback={<LoadingSpinner />}>
                  <Flights />
                </Suspense>
              </PageTransition>
            </RouteGuard>
          } 
        />
        
        <Route 
          path="/liveness-test" 
          element={<UltimateLivenessDetector />} 
        />
        
        <Route 
          path="/boarding-pass" 
          element={
            <RouteGuard>
              <PageTransition pathname={location.pathname}>
                <Suspense fallback={<LoadingSpinner />}>
                  <BoardingPass />
                </Suspense>
              </PageTransition>
            </RouteGuard>
          } 
        />
        
        <Route 
          path="/wait-times" 
          element={
            <RouteGuard>
              <PageTransition pathname={location.pathname}>
                <Suspense fallback={<LoadingSpinner />}>
                  <WaitTimes />
                </Suspense>
              </PageTransition>
            </RouteGuard>
          } 
        />
        
        <Route 
          path="/map" 
          element={
            <RouteGuard>
              <PageTransition pathname={location.pathname}>
                <Suspense fallback={<LoadingSpinner />}>
                  <Map />
                </Suspense>
              </PageTransition>
            </RouteGuard>
          } 
        />
        
        <Route 
          path="/more" 
          element={
            <RouteGuard>
              <PageTransition pathname={location.pathname}>
                <Suspense fallback={<LoadingSpinner />}>
                  <More />
                </Suspense>
              </PageTransition>
            </RouteGuard>
          } 
        />
        
        {/* 🔐 IDENTITY VERIFICATION ROUTES - Professional Features */}
        <Route 
          path="/identity-verification" 
          element={
            <RouteGuard>
              <PageTransition pathname={location.pathname}>
                <Suspense fallback={<LoadingSpinner />}>
                  <ComprehensiveIdentityVerification />
                </Suspense>
              </PageTransition>
            </RouteGuard>
          } 
        />
        
        <Route 
          path="/enroll" 
          element={
            <RouteGuard>
              <PageTransition pathname={location.pathname}>
                <Suspense fallback={<LoadingSpinner />}>
                  <ComprehensiveIdentityVerification />
                </Suspense>
              </PageTransition>
            </RouteGuard>
          } 
        />
        
        {/* 🔗 WORKFLOW ROUTES - Complete Biometric Journey */}
        <Route 
          path="/verify" 
          element={<Navigate to="/identity-verification" replace />} 
        />
        
        <Route 
          path="/complete-verification" 
          element={
            <RouteGuard>
              <PageTransition pathname={location.pathname}>
                <Suspense fallback={<LoadingSpinner />}>
                  <ComprehensiveIdentityVerification />
                </Suspense>
              </PageTransition>
            </RouteGuard>
          } 
        />
        
        {/* 🔗 ALIASES for main workflow - Redirects old/convenience paths to the correct workflow */}
        <Route 
          path="/passport-scanner" 
          element={
            <RouteGuard>
              <PageTransition pathname={location.pathname}>
                <Suspense fallback={<LoadingSpinner />}>
                  <UnifiedPassportScanner
                    onScanSuccess={(result) => {
                      navigate('/identity-verification', { state: { passportData: result.data } });
                    }}
                  />
                </Suspense>
              </PageTransition>
            </RouteGuard>
          } 
        />
        
        <Route path="/scanner" element={<Navigate to="/passport-scanner" replace />} />
        <Route path="/passport" element={<Navigate to="/passport-scanner" replace />} />
        <Route path="/scan" element={<Navigate to="/passport-scanner" replace />} />
        <Route path="/biometric" element={<Navigate to="/identity-verification" replace />} />
        <Route path="/face-verification" element={<Navigate to="/identity-verification" replace />} />
        <Route path="/test-scanner" element={<Navigate to="/identity-verification" replace />} />
        <Route path="/test-liveness" element={<Navigate to="/identity-verification" replace />} />
        
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

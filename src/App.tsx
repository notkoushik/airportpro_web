import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ErrorBoundary } from 'react-error-boundary';
import { Location } from 'react-router-dom'; // Import Location type

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


// Loading Component
const LoadingSpinner: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
    <div className="flex flex-col items-center space-y-4">
      <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-lg font-medium text-gray-700">Loading...</p>
      <p className="text-sm text-gray-500">Initializing professional components</p>
    </div>
  </div>
);

// Error Fallback Component
const ErrorFallback: React.FC<{ error: Error; resetErrorBoundary: () => void }> = ({ 
  error, 
  resetErrorBoundary 
}) => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-red-100 p-4">
    <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <span className="text-2xl">⚠️</span>
      </div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">Something went wrong</h2>
      <p className="text-gray-600 mb-4">
        {error.message || 'An unexpected error occurred'}
      </p>
      <div className="flex flex-col space-y-2">
        <button
          onClick={resetErrorBoundary}
          className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
        >
          Try Again
        </button>
        <button
          onClick={() => window.location.href = '/'}
          className="bg-gray-300 hover:bg-gray-400 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors"
        >
          Go Home
        </button>
      </div>
    </div>
  </div>
);

// Route Guard Component (for future authentication)
const RouteGuard: React.FC<{ children: React.ReactNode; requireAuth?: boolean }> = ({ 
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

// Page Transition Wrapper (Simplified, without framer-motion)
const PageTransition: React.FC<{ children: React.ReactNode; location: Location }> = ({
  children,
  location
}) => (
  <div key={location.pathname} className="w-full animate-fadeIn">
    {children}
  </div>
);

// Main App Component
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
                <PageTransition location={location}>
                  <Home />
                </PageTransition>
              } 
            />
            
            {/* 📱 AIRPORT APP ROUTES - Lazy Loaded */}
            <Route 
              path="/flights" 
              element={
                <RouteGuard>
                  <PageTransition location={location}>
                    <Suspense fallback={<LoadingSpinner />}>
                      <Flights />
                    </Suspense>
                  </PageTransition>
                </RouteGuard>
              } 
            />
            <Route path="/liveness-test" element={<UltimateLivenessDetector />} />
            <Route 
              path="/boarding-pass" 
              element={
                <RouteGuard>
                  <PageTransition location={location}>
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
                  <PageTransition location={location}>
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
                  <PageTransition location={location}>
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
                  <PageTransition location={location}>
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
                  <PageTransition location={location}>
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
                  <PageTransition location={location}>
                    <Suspense fallback={<LoadingSpinner />}>
                      <ComprehensiveIdentityVerification />
                    </Suspense>
                  </PageTransition>
                </RouteGuard>
              } 
            />
            
            {/*  WORKFLOW ROUTES - Complete Biometric Journey */}
            <Route 
              path="/verify" 
              element={<Navigate to="/identity-verification" replace />} 
            />
            
            <Route 
              path="/complete-verification" 
              element={
                <RouteGuard>
                  <PageTransition location={location}>
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
                  <PageTransition location={location}>
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
                <PageTransition location={location}>
                  <NotFound />
                </PageTransition>
              } 
            />
            
          </Routes>
       

    </ErrorBoundary>
  );
};


export default App;

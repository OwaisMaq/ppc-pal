
import './App.css';
import {
  BrowserRouter as Router,
  Routes,
  Route,
} from "react-router-dom";
import { AuthProvider } from '@/contexts/AuthContext';
import PublicLanding from './pages/PublicLanding';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import ProtectedRoute from './components/ProtectedRoute';
import DataManagement from './pages/DataManagement';
import Feedback from './pages/Feedback';
import About from './pages/About';
import Company from './pages/Company';
import Contact from './pages/Contact';
import Privacy from './pages/Privacy';
import NotFound from './pages/NotFound';
import Trends from './pages/Trends';
import OptimizationLogs from './pages/OptimizationLogs';
import KeywordData from './pages/KeywordData';
import Recommendations from './pages/Recommendations';
import Reporting from './pages/Reporting';

import Settings from "@/pages/Settings";
import AmazonCallbackPage from './pages/AmazonCallbackPage';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<PublicLanding />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/auth/amazon/callback" element={<AmazonCallbackPage />} />
          <Route path="/about" element={<About />} />
          <Route path="/company" element={<Company />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/privacy" element={<Privacy />} />
          
          {/* Protected routes */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          <Route path="/settings" element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          } />
          <Route path="/trends" element={
            <ProtectedRoute>
              <Trends />
            </ProtectedRoute>
          } />
          <Route path="/optimization-logs" element={
            <ProtectedRoute>
              <OptimizationLogs />
            </ProtectedRoute>
          } />
          <Route path="/keyword-data" element={
            <ProtectedRoute>
              <KeywordData />
            </ProtectedRoute>
          } />
          <Route path="/recommendations" element={
            <ProtectedRoute>
              <Recommendations />
            </ProtectedRoute>
          } />
          <Route path="/reporting" element={
            <ProtectedRoute>
              <Reporting />
            </ProtectedRoute>
          } />
          <Route path="/data-management" element={
            <ProtectedRoute>
              <DataManagement />
            </ProtectedRoute>
          } />
          <Route path="/feedback" element={
            <ProtectedRoute>
              <Feedback />
            </ProtectedRoute>
          } />
          
          {/* Catch all route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;

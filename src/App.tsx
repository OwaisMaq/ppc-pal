import './App.css';
import {
  BrowserRouter as Router,
  Routes,
  Route,
} from "react-router-dom";
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

import Settings from "@/pages/Settings";
import AmazonCallbackPage from './pages/AmazonCallbackPage';

function App() {
  return (
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
  );
}

export default App;

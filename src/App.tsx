import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useAppContext } from './store/AppContext';
import Login from './pages/Login';
import MapPage from './pages/MapPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { currentUser, currentGroup } = useAppContext();
  
  if (!currentUser || !currentGroup) {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
}

import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <h2>申し訳ありません、エラーが発生しました。</h2>
          <pre style={{ textAlign: 'left', background: '#eee', padding: '10px', marginTop: '10px', overflowX: 'auto' }}>
            {this.state.error?.message}
          </pre>
          <button onClick={() => window.location.href = '/'} className="btn btn-primary" style={{ marginTop: '20px' }}>
            トップへ戻る
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route 
        path="/map" 
        element={
          <ProtectedRoute>
            <MapPage />
          </ProtectedRoute>
        } 
      />
    </Routes>
  );
}

function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <ErrorBoundary>
          <AppRoutes />
        </ErrorBoundary>
      </BrowserRouter>
    </AppProvider>
  );
}

export default App;

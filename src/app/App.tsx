import { RouterProvider } from 'react-router';
import { router } from './routes';
import { Toaster } from './components/ui/sonner';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AuthScreen } from './screens/AuthScreen';

function AppShell() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-sm text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  return <RouterProvider router={router} />;
}

export default function App() {
  return (
    <>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
      <Toaster />
    </>
  );
}

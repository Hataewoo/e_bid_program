import { RouterProvider } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { GlobalBusyOverlay } from './components/GlobalBusyOverlay';
import { GlobalConfirmDialog } from '@/components/ui/GlobalConfirmDialog';
import { GlobalErrorListeners } from './components/GlobalErrorListeners';
import { GlobalSystemBar } from './components/GlobalSystemBar';
import { router } from './router';

export function App() {
  return (
    <ErrorBoundary>
      <GlobalErrorListeners />
      <GlobalBusyOverlay />
      <GlobalConfirmDialog />
      <div className="flex h-full min-h-0 flex-col">
        <div className="min-h-0 flex-1">
          <RouterProvider router={router} />
        </div>
        <GlobalSystemBar />
      </div>
    </ErrorBoundary>
  );
}

import { ErrorBoundary } from 'react-error-boundary';
import { ReactNode } from 'react';

function ErrorFallback({ error }: { error: Error }) {
  return (
    <div role="alert">
      <p>Algo deu errado:</p>
      <pre>{error.message}</pre>
    </div>
  );
}

export default function MyErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      {children}
    </ErrorBoundary>
  );
}

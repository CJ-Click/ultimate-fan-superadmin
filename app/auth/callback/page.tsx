import { Suspense } from 'react';
import GoogleAuthCallback from './GoogleAuthCallback';

export default function AuthCallbackPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Suspense>
        <GoogleAuthCallback />
      </Suspense>
    </div>
  );
}

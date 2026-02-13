import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signIn, signInWithGoogle } from '@repo/shared/auth';
import { useAuth } from '@repo/shared/auth/context';
import { SharedLoginPage } from '@repo/ui';

export const LoginPage = () => {
  const navigate = useNavigate();
  const { loginAsDemo } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async ({ email, password }: { email: string; password: string }) => {
    setLoading(true);
    setError(null);

    try {
      await signIn(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setError(null);
      await signInWithGoogle();
    } catch (err: any) {
      setError(err.message || 'Failed to sign in with Google');
      setLoading(false);
    }
  };

  const handleDemoLogin = () => {
    loginAsDemo?.();
    navigate('/dashboard');
  };

  return (
    <SharedLoginPage
      appName="Open-ETL"
      title="Log into my account"
      description="Sign in to continue to workflow automation and orchestration."
      loading={loading}
      error={error}
      onEmailSignIn={handleLogin}
      onGoogleSignIn={handleGoogleLogin}
      onDemoSignIn={handleDemoLogin}
      footer={(
        <div className="text-center">
          <span className="text-slate-400">Don&apos;t have an account? </span>
          <Link to="/register" className="font-medium text-blue-300 hover:text-blue-200">
            Sign up
          </Link>
        </div>
      )}
    />
  );
};

import { FormEvent, useState } from 'react';
import { toast } from 'sonner';
import { BookOpen } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { useAuth } from '../context/AuthContext';

export function AuthScreen() {
  const { login, signup } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignupMode, setIsSignupMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!email.trim() || !password.trim()) {
      toast.error('Email and password are required');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isSignupMode) {
        const result = await signup(email.trim(), password);
        if (result.emailConfirmationRequired && !result.user) {
          toast.success('Account created. Check your email to confirm.');
        } else {
          toast.success('Account created and signed in.');
        }
      } else {
        await login(email.trim(), password);
        toast.success('Signed in successfully.');
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Authentication failed';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-6">
        <div className="flex items-center justify-center gap-2 mb-6">
          <BookOpen className="w-6 h-6 text-blue-600" />
          <h1 className="font-semibold text-xl">Flashcards</h1>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Email</label>
            <Input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Password</label>
            <Input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Your password"
              autoComplete={isSignupMode ? 'new-password' : 'current-password'}
            />
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting
              ? 'Please wait...'
              : isSignupMode
                ? 'Create account'
                : 'Sign in'}
          </Button>
        </form>

        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => setIsSignupMode((previous) => !previous)}
            className="text-sm text-blue-600 hover:underline"
          >
            {isSignupMode
              ? 'Already have an account? Sign in'
              : "Don't have an account? Create one"}
          </button>
        </div>
      </Card>
    </div>
  );
}

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

interface AuthUser {
  id: string;
  email: string | null;
}

interface SignupResult {
  user: AuthUser | null;
  emailConfirmationRequired: boolean;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  signup: (email: string, password: string) => Promise<SignupResult>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const method = init?.method ?? 'GET';
  const startedAt = Date.now();
  const response = await fetch(url, {
    credentials: 'include',
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    console.error('[Auth API] Request failed', {
      url,
      method,
      status: response.status,
      statusText: response.statusText,
      durationMs: Date.now() - startedAt,
      payload,
    });
  } else {
    console.log('[Auth API] Request succeeded', {
      url,
      method,
      status: response.status,
      durationMs: Date.now() - startedAt,
    });
  }

  if (!response.ok) {
    if (response.status === 404 && url.startsWith('/api/')) {
      throw new Error(
        `Endpoint not found (${method} ${url}). In local dev, run a backend that serves /api (e.g. Vercel dev).`
      );
    }

    const message =
      payload && typeof payload.error === 'string'
        ? payload.error
        : `Request failed (${method} ${url}) - ${response.status}`;
    throw new Error(message);
  }

  return payload as T;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const data = await requestJson<{ user: AuthUser }>('/api/auth/me', {
        method: 'GET',
      });
      setUser(data.user);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  const login = useCallback(async (email: string, password: string) => {
    const data = await requestJson<{ user: AuthUser }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setUser(data.user);
    return data.user;
  }, []);

  const signup = useCallback(async (email: string, password: string) => {
    const data = await requestJson<SignupResult>('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setUser(data.emailConfirmationRequired ? null : data.user);
    return data;
  }, []);

  const logout = useCallback(async () => {
    await requestJson<{ success: boolean }>('/api/auth/logout', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      login,
      signup,
      logout,
      refreshUser,
    }),
    [user, isLoading, login, signup, logout, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

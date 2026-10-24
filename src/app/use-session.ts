import { useCallback, useEffect, useState } from 'react';
import { createAuth, type AuthClient } from '../core/auth/client';
import type { User } from '../core/auth/schema';
import { readConfig, saveApiBase } from '../core/config/runtime';
import { messageOf } from '../shared/data/guards';
export function useSession() {
  const [auth, setAuth] = useState<AuthClient | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [base, setBase] = useState(() => readConfig().cmsBase);
  const [restoring, setRestoring] = useState(true);
  const [message, setMessage] = useState('');
  useEffect(() => {
    let disposed = false;
    const client = createAuth({
      base,
      onChange: (session) => {
        if (!disposed) setUser(session?.user ?? null);
      },
    });
    setAuth(client);
    setRestoring(true);
    void client
      .restore()
      .catch((error: unknown) => {
        if (!disposed && !(error instanceof Error && 'status' in error && error.status === 401))
          setMessage(messageOf(error));
      })
      .finally(() => {
        if (!disposed) setRestoring(false);
      });
    return () => {
      disposed = true;
      client.close();
    };
  }, [base]);
  const saveConnection = useCallback(
    (value: string) => {
      if (auth?.user) throw new Error('Keluar dari sesi CMS sebelum mengganti koneksi.');
      saveApiBase(value);
      setMessage('Koneksi disimpan. Silakan masuk menggunakan akun CMS.');
      setBase(readConfig().cmsBase);
    },
    [auth],
  );
  return { auth, user, restoring, message, saveConnection };
}

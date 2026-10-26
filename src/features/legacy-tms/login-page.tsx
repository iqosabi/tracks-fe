import { useEffect, useRef } from 'react';
import { LoginPage } from '../auth/login-page';
import { TmsClient } from './client';
import type { TmsUser } from './contract';

export function TmsLoginPage({
  onLogin,
}: {
  onLogin: (session: { client: TmsClient; user: TmsUser }) => void;
}) {
  const active = useRef<AbortController | null>(null);
  useEffect(() => () => active.current?.abort(), []);
  return (
    <LoginPage
      restoring={false}
      message=""
      identity="email"
      submitLabel="Masuk ke TMS"
      authLabel="TMS"
      backHref="/"
      onLogin={async (email, password) => {
        const abort = new AbortController();
        active.current = abort;
        try {
          const session = await TmsClient.login({ email, password }, abort.signal);
          if (abort.signal.aborted) {
            session.client.dispose();
            return;
          }
          onLogin(session);
        } finally {
          if (active.current === abort) active.current = null;
        }
      }}
    />
  );
}

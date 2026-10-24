import { Component, type ReactNode } from 'react';
/** Keep unexpected rendering failures recoverable without exposing internal API data. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <main className="startup-error" role="alert">
        <h1>Workspace belum dapat dimuat.</h1>
        <p>Muat ulang untuk memulihkan aplikasi.</p>
        <button className="button primary" onClick={() => location.reload()}>
          Muat ulang
        </button>
      </main>
    ) : (
      this.props.children
    );
  }
}

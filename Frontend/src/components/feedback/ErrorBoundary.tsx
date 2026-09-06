import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}
interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex h-screen flex-col items-center justify-center gap-4 p-8 text-center">
          <p className="text-2xl font-semibold text-texto">Algo salió mal</p>
          <p className="text-sm text-texto-tenue">{this.state.error.message}</p>
          <button
            className="rounded-lg bg-sangre-600 px-4 py-2 text-sm text-white hover:bg-sangre-700"
            onClick={() => window.location.reload()}
          >
            Recargar página
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

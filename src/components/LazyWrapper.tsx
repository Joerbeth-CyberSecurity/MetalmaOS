import React, { Suspense, lazy, ComponentType } from 'react';
import { Loader2 } from 'lucide-react';

interface LazyWrapperProps {
  fallback?: React.ReactNode;
  errorBoundary?: boolean;
}

// Componente de loading padrão
const DefaultFallback = () => (
  <div className="flex items-center justify-center p-8">
    <div className="flex flex-col items-center gap-2">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">Carregando...</p>
    </div>
  </div>
);

// Error Boundary para capturar erros de carregamento
class LazyErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode; fallback?: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Lazy loading error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="flex items-center justify-center p-8">
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center">
                <span className="text-red-600 text-sm">!</span>
              </div>
              <p className="text-sm text-red-600">Erro ao carregar componente</p>
              <button
                onClick={() => this.setState({ hasError: false })}
                className="text-xs text-blue-600 hover:underline"
              >
                Tentar novamente
              </button>
            </div>
          </div>
        )
      );
    }

    return this.props.children;
  }
}

// HOC para criar componentes lazy com fallback
export function withLazyLoading<T extends object>(
  importFn: () => Promise<{ default: ComponentType<T> }>,
  fallback?: React.ReactNode
) {
  const LazyComponent = lazy(importFn);

  return function LazyWrapper(props: T & LazyWrapperProps) {
    const { fallback: propFallback, errorBoundary = true, ...componentProps } = props;

    const Component = (
      <Suspense fallback={propFallback || fallback || <DefaultFallback />}>
        <LazyComponent {...(componentProps as T)} />
      </Suspense>
    );

    if (errorBoundary) {
      return (
        <LazyErrorBoundary fallback={propFallback || fallback}>
          {Component}
        </LazyErrorBoundary>
      );
    }

    return Component;
  };
}

// Hook para lazy loading com estado
export function useLazyLoading<T>(
  importFn: () => Promise<{ default: ComponentType<T> }>,
  deps: React.DependencyList = []
) {
  const [Component, setComponent] = React.useState<ComponentType<T> | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    let isMounted = true;

    const loadComponent = async () => {
      setLoading(true);
      setError(null);

      try {
        const module = await importFn();
        if (isMounted) {
          setComponent(() => module.default);
        }
      } catch (err) {
        if (isMounted) {
          setError(err as Error);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadComponent();

    return () => {
      isMounted = false;
    };
  }, deps);

  return { Component, loading, error };
}

// Componente para lazy loading de rotas
export function LazyRoute({
  importFn,
  fallback,
  errorBoundary = true,
}: {
  importFn: () => Promise<{ default: ComponentType<any> }>;
  fallback?: React.ReactNode;
  errorBoundary?: boolean;
}) {
  const LazyComponent = lazy(importFn);

  const Component = (
    <Suspense fallback={fallback || <DefaultFallback />}>
      <LazyComponent />
    </Suspense>
  );

  if (errorBoundary) {
    return (
      <LazyErrorBoundary fallback={fallback}>
        {Component}
      </LazyErrorBoundary>
    );
  }

  return Component;
}

// Componente para lazy loading de imagens
export function LazyImage({
  src,
  alt,
  className,
  fallback,
  ...props
}: {
  src: string;
  alt: string;
  className?: string;
  fallback?: React.ReactNode;
} & React.ImgHTMLAttributes<HTMLImageElement>) {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);

  const handleLoad = () => {
    setLoading(false);
  };

  const handleError = () => {
    setLoading(false);
    setError(true);
  };

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-muted ${className}`}>
        {fallback || (
          <div className="text-center text-muted-foreground">
            <p className="text-sm">Erro ao carregar imagem</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}
      <img
        src={src}
        alt={alt}
        onLoad={handleLoad}
        onError={handleError}
        className={`transition-opacity duration-200 ${loading ? 'opacity-0' : 'opacity-100'}`}
        {...props}
      />
    </div>
  );
}

// Componente para lazy loading de listas
export function LazyList<T>({
  items,
  renderItem,
  loading,
  error,
  fallback,
  className,
}: {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  loading?: boolean;
  error?: Error | null;
  fallback?: React.ReactNode;
  className?: string;
}) {
  if (loading) {
    return (
      <div className={className}>
        {fallback || <DefaultFallback />}
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="text-center text-red-600">
          <p className="text-sm">Erro ao carregar lista</p>
          <p className="text-xs text-muted-foreground">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {items.map((item, index) => (
        <React.Fragment key={index}>
          {renderItem(item, index)}
        </React.Fragment>
      ))}
    </div>
  );
}

// Hook para intersection observer (lazy loading baseado em visibilidade)
export function useIntersectionObserver(
  ref: React.RefObject<Element>,
  options: IntersectionObserverInit = {}
) {
  const [isIntersecting, setIsIntersecting] = React.useState(false);

  React.useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
      },
      options
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [ref, options]);

  return isIntersecting;
}

// Componente para lazy loading baseado em visibilidade
export function LazyVisible({
  children,
  fallback,
  rootMargin = '100px',
  threshold = 0.1,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  rootMargin?: string;
  threshold?: number;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const isVisible = useIntersectionObserver(ref, { rootMargin, threshold });

  return (
    <div ref={ref}>
      {isVisible ? children : (fallback || <DefaultFallback />)}
    </div>
  );
}

export default {
  withLazyLoading,
  useLazyLoading,
  LazyRoute,
  LazyImage,
  LazyList,
  useIntersectionObserver,
  LazyVisible,
};

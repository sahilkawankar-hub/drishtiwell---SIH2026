import { Loader2 } from 'lucide-react';

interface LoadingProps {
  text?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function Loading({ text = 'Loading...', size = 'md' }: LoadingProps) {
  const sizeMap = { sm: 'h-4 w-4', md: 'h-6 w-6', lg: 'h-10 w-10' };
  return (
    <div className="flex items-center justify-center gap-3 py-8 text-slate-500">
      <Loader2 className={`${sizeMap[size]} animate-spin text-primary-400`} />
      <span className="text-sm">{text}</span>
    </div>
  );
}

interface ErrorMessageProps {
  error: Error | string | null;
  retry?: () => void;
}

export function ErrorMessage({ error, retry }: ErrorMessageProps) {
  if (!error) return null;
  const message = typeof error === 'string' ? error : error.message;
  return (
    <div className="flex items-center gap-3 p-4 bg-status-criticalBg border border-status-critical/30 rounded-lg text-status-critical text-sm">
      <span>⚠ {message}</span>
      {retry && (
        <button onClick={retry} className="ml-auto btn btn-ghost text-xs">
          Retry
        </button>
      )}
    </div>
  );
}

export function EmptyState({ message = 'No data available' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-slate-600">
      <span className="text-4xl mb-3">📭</span>
      <p className="text-sm">{message}</p>
    </div>
  );
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

export function CardSkeleton() {
  return (
    <div className="card p-4 space-y-3">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  );
}

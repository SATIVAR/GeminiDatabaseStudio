import { cn } from '@/lib/utils';

export const LoadingAnimation = ({ message, className }: { message: string; className?: string }) => {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-6 text-center p-8 w-full glass-card", className)}>
      <div className="w-24 h-24 relative">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="absolute inset-0 rounded-full border-2 border-primary/50 animate-pulse"
            style={{ animationDelay: `${i * 0.3}s` }}
          />
        ))}
        <svg
          className="w-full h-full animate-spin-slow"
          viewBox="0 0 100 100"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="hsl(var(--primary))" />
              <stop offset="100%" stopColor="hsl(var(--accent))" />
            </linearGradient>
          </defs>
          <path
            d="M50 2.5A47.5 47.5 0 0 1 97.5 50M2.5 50A47.5 47.5 0 0 1 50 2.5"
            fill="none"
            stroke="url(#grad)"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <p className="text-lg font-medium text-foreground">{message || 'Processing...'}</p>
      <p className="text-sm text-muted-foreground">AI is working its magic. Please wait a moment.</p>
    </div>
  );
};

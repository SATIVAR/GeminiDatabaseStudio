import { cn } from '@/lib/utils';

export const LoadingAnimation = ({ message, className }: { message: string; className?: string }) => {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-6 text-center p-8 w-full glass-card h-[40vh]", className)}>
      <div className="w-24 h-24 relative flex items-center justify-center">
        {/* Orbital rings */}
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="absolute inset-0 rounded-full border-2 animate-spin-slow opacity-60"
            style={{
              borderColor: `hsl(var(--primary) / ${0.6 - i * 0.2})`,
              animationDelay: `${i * 0.2}s`,
              animationDirection: i % 2 === 0 ? 'normal' : 'reverse',
              transform: `rotateY(${i * 60}deg) rotateX(${i * 15}deg)`
            }}
          />
        ))}
         {/* Pulsing core */}
        <div className="w-8 h-8 bg-primary rounded-full animate-pulse shadow-[0_0_20px_4px_hsl(var(--primary)/0.7)]" />
      </div>
      <div className="flex flex-col items-center">
        <p className="text-xl font-medium text-foreground tracking-wide">{message || 'Processing...'}</p>
        <p className="text-md text-muted-foreground mt-1">AI is working its magic. Please wait a moment.</p>
      </div>
    </div>
  );
};

import type { RateLimit } from '@ohnicerepo/shared';

interface RateLimitStatusProps {
  rateLimit: RateLimit;
}

export function RateLimitStatus({ rateLimit }: RateLimitStatusProps) {
  console.log(rateLimit);
  const used = rateLimit.limit - rateLimit.remaining;
  const isWarning = rateLimit.remaining / rateLimit.limit < 0.2;

  return (
    <div className="rate-limit-status">
      <span className={`rate-limit-indicator ${isWarning ? 'warning' : ''}`}>
        API: {used.toLocaleString()}/{rateLimit.limit.toLocaleString()} used
      </span>
      {isWarning && <span className="rate-limit-warning">⚠️ Approaching rate limit</span>}
    </div>
  );
}

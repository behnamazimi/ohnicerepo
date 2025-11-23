import type { RateLimit } from '../../types';

interface RateLimitStatusProps {
  rateLimit: RateLimit;
}

export function RateLimitStatus({ rateLimit }: RateLimitStatusProps) {
  const isWarning = rateLimit.remaining / rateLimit.limit < 0.2;

  return (
    <div className="rate-limit-status">
      <span className={`rate-limit-indicator ${isWarning ? 'warning' : ''}`}>
        API: {rateLimit.remaining.toLocaleString()} / {rateLimit.limit.toLocaleString()} remaining
      </span>
      {isWarning && (
        <span className="rate-limit-warning">
          ⚠️ Approaching rate limit
        </span>
      )}
    </div>
  );
}


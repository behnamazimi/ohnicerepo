import type { RateLimit } from '../../types';
import { RateLimitStatus } from '../Header/RateLimitStatus';

interface FooterProps {
  rateLimit: RateLimit | null;
}

export function Footer({ rateLimit }: FooterProps) {
  return (
    <footer className="app-footer">
      <p className="footer-text">Built for fun to find fun repos 🚀</p>
      {rateLimit && <RateLimitStatus rateLimit={rateLimit} />}
    </footer>
  );
}


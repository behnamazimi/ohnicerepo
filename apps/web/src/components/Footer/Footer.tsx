import type { RateLimit } from '@ohnicerepo/shared';
import { RateLimitStatus } from '../Header/RateLimitStatus';

interface FooterProps {
  rateLimit: RateLimit | null;
}

export function Footer({ rateLimit }: FooterProps) {
  return (
    <footer className="app-footer">
      <p className="footer-text">Made for fun, to discover GitHub gems 🚀</p>
      <a
        href="https://github.com/behnamazimi/ohnicerepo"
        target="_blank"
        rel="noopener noreferrer"
        className="footer-github-link"
      >
        View on GitHub
      </a>
      {rateLimit && <RateLimitStatus rateLimit={rateLimit} />}
    </footer>
  );
}

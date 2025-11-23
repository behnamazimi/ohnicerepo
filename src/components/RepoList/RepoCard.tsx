import type { Repository } from '../../types';
import { formatDate } from '../../utils/date';

interface RepoCardProps {
  repo: Repository;
  index: number;
}

export function RepoCard({ repo, index }: RepoCardProps) {
  return (
    <div
      className="repo-card"
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      <div className="repo-header">
        <a
          href={repo.url}
          target="_blank"
          rel="noopener noreferrer"
          className="repo-name"
        >
          {repo.name}
        </a>
        <div className="repo-stars">
          <span className="star-icon">★</span>
          {repo.stars.toLocaleString()}
        </div>
      </div>
      {repo.description && (
        <p className="repo-description">{repo.description}</p>
      )}
      <div className="repo-meta">
        {repo.language && (
          <span className="repo-language">{repo.language}</span>
        )}
        <span className="repo-date">
          Created {formatDate(repo.createdAt)}
        </span>
      </div>
    </div>
  );
}


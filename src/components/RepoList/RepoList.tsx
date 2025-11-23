import type { ApiResponse } from '../../types';
import { RepoCard } from './RepoCard';

interface RepoListProps {
  data: ApiResponse;
}

export function RepoList({ data }: RepoListProps) {
  return (
    <>
      <div className="results-info">
        <p>
          Found <strong>{data.total.toLocaleString()}</strong> repositories
          {data.totalPages > 1 && (
            <> (Page {data.page} of {data.totalPages})</>
          )}
        </p>
      </div>

      <div className="repos-grid">
        {data.repos.map((repo, index) => (
          <RepoCard key={repo.id} repo={repo} index={index} />
        ))}
      </div>
    </>
  );
}


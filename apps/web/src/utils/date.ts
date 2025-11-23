// Parse custom date format (7d, 2w, 1m)
export function parseCustomDate(value: string): number | null {
  const trimmed = value.trim().toLowerCase();
  const match = trimmed.match(/^(\d+)([dwm])$/);
  if (!match) return null;

  const num = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 'd':
      return num;
    case 'w':
      return num * 7;
    case 'm':
      return num * 30;
    default:
      return null;
  }
}

// Calculate days from absolute date
export function calculateDaysFromDate(dateStr: string): number {
  const selectedDate = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  selectedDate.setHours(0, 0, 0, 0);
  const diffTime = today.getTime() - selectedDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays >= 0 ? diffDays : 0;
}

// Format date for display
export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

interface StarsFilterProps {
  value: number;
  onChange: (value: number) => void;
}

export function StarsFilter({ value, onChange }: StarsFilterProps) {
  return (
    <div className="filter-group">
      <label htmlFor="stars">Minimum stars:</label>
      <input
        id="stars"
        type="number"
        min="0"
        value={value}
        onChange={(e) => {
          const numValue = parseInt(e.target.value, 10);
          if (!isNaN(numValue) && numValue >= 0) {
            onChange(numValue);
          }
        }}
        className="filter-input"
      />
    </div>
  );
}


import { useEffect, useState } from 'react';

interface StarsFilterProps {
  value: number;
  onChange: (value: number) => void;
}

export function StarsFilter({ value, onChange }: StarsFilterProps) {
  const [inputValue, setInputValue] = useState<string>(String(value));

  // Keep local state in sync if parent value changes externally
  useEffect(() => {
    setInputValue(String(value));
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;

    // Allow empty string while typing
    if (next === '') {
      setInputValue(next);
      return;
    }

    // Only allow digits
    if (!/^\d*$/.test(next)) {
      return;
    }

    setInputValue(next);

    const numValue = parseInt(next, 10);
    if (!isNaN(numValue) && numValue >= 0) {
      onChange(numValue);
    }
  };

  const handleBlur = () => {
    // If empty on blur, normalize to 0
    if (inputValue === '') {
      onChange(0);
      setInputValue('0');
      return;
    }

    // As a safety net, ensure we end up with a valid non-negative integer
    if (!/^\d+$/.test(inputValue)) {
      setInputValue(String(value));
      return;
    }

    const numValue = parseInt(inputValue, 10);
    if (isNaN(numValue) || numValue < 0) {
      setInputValue(String(value));
      return;
    }

    // Sync parent if needed
    if (numValue !== value) {
      onChange(numValue);
    }
  };

  return (
    <div className="filter-group">
      <label htmlFor="stars">Minimum stars:</label>
      <input
        id="stars"
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={inputValue}
        onChange={handleChange}
        onBlur={handleBlur}
        className="filter-input"
      />
    </div>
  );
}

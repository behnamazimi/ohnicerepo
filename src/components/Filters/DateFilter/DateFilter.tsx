import { useState, useRef } from 'react';
import { useClickOutside } from '../../../hooks/useClickOutside';
import type { DateFilterState, DatePreset } from '../../../types';
import { DateFilterDropdown } from './DateFilterDropdown';

interface DateFilterProps {
  dateFilter: DateFilterState;
  dateType: 'exact' | 'after';
  customInputValue: string;
  absoluteDateValue: string;
  getDateFilterDisplay: () => string;
  onPresetSelect: (preset: DatePreset) => void;
  onCustomInputChange: (value: string) => void;
  onAbsoluteDateChange: (dateStr: string) => void;
  onDateTypeChange: (type: 'exact' | 'after') => void;
}

export function DateFilter({
  dateFilter,
  dateType,
  customInputValue,
  absoluteDateValue,
  getDateFilterDisplay,
  onPresetSelect,
  onCustomInputChange,
  onAbsoluteDateChange,
  onDateTypeChange,
}: DateFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dateDropdownRef = useRef<HTMLDivElement>(null);

  useClickOutside(dateDropdownRef, () => setIsOpen(false), isOpen);

  const handlePresetSelect = (preset: Parameters<typeof onPresetSelect>[0]) => {
    onPresetSelect(preset);
    setIsOpen(false);
  };

  return (
    <div className="filter-group date-filter-group">
      <label>{dateType === 'exact' ? 'Repos created on:' : 'Repos created after:'}</label>
      <div className="date-filter-wrapper" ref={dateDropdownRef}>
        <button
          type="button"
          className="date-filter-button"
          onClick={() => setIsOpen(!isOpen)}
        >
          <span>{getDateFilterDisplay()}</span>
          <span className="date-filter-arrow">{isOpen ? '▲' : '▼'}</span>
        </button>
        {isOpen && (
          <DateFilterDropdown
            dateFilter={dateFilter}
            dateType={dateType}
            customInputValue={customInputValue}
            absoluteDateValue={absoluteDateValue}
            onPresetSelect={handlePresetSelect}
            onCustomInputChange={onCustomInputChange}
            onAbsoluteDateChange={onAbsoluteDateChange}
            onDateTypeChange={onDateTypeChange}
          />
        )}
      </div>
    </div>
  );
}


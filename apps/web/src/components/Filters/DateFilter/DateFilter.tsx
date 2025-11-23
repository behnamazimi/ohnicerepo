import { useState, useRef } from 'react';
import { useClickOutside } from '../../../hooks/useClickOutside';
import type { DateFilterState, DatePreset } from '@ohnicerepo/shared';
import { DateFilterDropdown } from './DateFilterDropdown';

interface DateFilterProps {
  dateFilter: DateFilterState;
  dateType: 'exact' | 'after' | 'range';
  customInputValue: string;
  absoluteDateValue: string;
  startDateValue: string;
  endDateValue: string;
  tempStartDateValue: string;
  tempEndDateValue: string;
  getDateFilterDisplay: () => string;
  onPresetSelect: (preset: DatePreset) => void;
  onCustomInputChange: (value: string) => void;
  onAbsoluteDateChange: (dateStr: string) => void;
  onTempDateRangeChange: (startDate: string, endDate: string) => void;
  onApplyDateRange: () => boolean;
  onDateTypeChange: (type: 'exact' | 'after' | 'range') => void;
}

export function DateFilter({
  dateFilter,
  dateType,
  customInputValue,
  absoluteDateValue,
  startDateValue,
  endDateValue,
  tempStartDateValue,
  tempEndDateValue,
  getDateFilterDisplay,
  onPresetSelect,
  onCustomInputChange,
  onAbsoluteDateChange,
  onTempDateRangeChange,
  onApplyDateRange,
  onDateTypeChange,
}: DateFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dateDropdownRef = useRef<HTMLDivElement>(null);

  useClickOutside(
    dateDropdownRef as React.RefObject<HTMLElement | null>,
    () => setIsOpen(false),
    isOpen
  );

  const handlePresetSelect = (preset: Parameters<typeof onPresetSelect>[0]) => {
    onPresetSelect(preset);
    setIsOpen(false);
  };

  const getLabel = () => {
    if (dateType === 'exact') return 'Repos created on:';
    if (dateType === 'range') return 'Repos created between:';
    return 'Repos created after:';
  };

  return (
    <div className="filter-group date-filter-group">
      <label>{getLabel()}</label>
      <div className="date-filter-wrapper" ref={dateDropdownRef}>
        <button type="button" className="date-filter-button" onClick={() => setIsOpen(!isOpen)}>
          <span>{getDateFilterDisplay()}</span>
          <span className="date-filter-arrow">{isOpen ? '▲' : '▼'}</span>
        </button>
        {isOpen && (
          <DateFilterDropdown
            dateFilter={dateFilter}
            dateType={dateType}
            customInputValue={customInputValue}
            absoluteDateValue={absoluteDateValue}
            startDateValue={startDateValue}
            endDateValue={endDateValue}
            tempStartDateValue={tempStartDateValue}
            tempEndDateValue={tempEndDateValue}
            onPresetSelect={handlePresetSelect}
            onCustomInputChange={onCustomInputChange}
            onAbsoluteDateChange={onAbsoluteDateChange}
            onTempDateRangeChange={onTempDateRangeChange}
            onApplyDateRange={(): boolean => {
              const success = onApplyDateRange();
              if (success && dateType === 'range') {
                setIsOpen(false);
              }
              return success;
            }}
            onDateTypeChange={onDateTypeChange}
          />
        )}
      </div>
    </div>
  );
}

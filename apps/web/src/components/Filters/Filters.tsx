import type { DateFilterState, LanguageOption, DatePreset } from '@ohnicerepo/shared';
import { DateFilter } from './DateFilter/DateFilter';
import { StarsFilter } from './StarsFilter';
import { LanguageFilter } from './LanguageFilter';

interface FiltersProps {
  dateFilter: DateFilterState;
  dateType: 'exact' | 'after' | 'range';
  stars: number;
  language: string;
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
  onStarsChange: (value: number) => void;
  onLanguageChange: (selectedOption: LanguageOption | null) => void;
}

export function Filters({
  dateFilter,
  dateType,
  stars,
  language,
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
  onStarsChange,
  onLanguageChange,
}: FiltersProps) {
  return (
    <div className="filters">
      <DateFilter
        dateFilter={dateFilter}
        dateType={dateType}
        customInputValue={customInputValue}
        absoluteDateValue={absoluteDateValue}
        startDateValue={startDateValue}
        endDateValue={endDateValue}
        tempStartDateValue={tempStartDateValue}
        tempEndDateValue={tempEndDateValue}
        getDateFilterDisplay={getDateFilterDisplay}
        onPresetSelect={onPresetSelect}
        onCustomInputChange={onCustomInputChange}
        onAbsoluteDateChange={onAbsoluteDateChange}
        onTempDateRangeChange={onTempDateRangeChange}
        onApplyDateRange={onApplyDateRange}
        onDateTypeChange={onDateTypeChange}
      />
      <StarsFilter value={stars} onChange={onStarsChange} />
      <LanguageFilter value={language} onChange={onLanguageChange} />
    </div>
  );
}

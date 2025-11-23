import type { DateFilterState, LanguageOption, DatePreset } from '../../types';
import { DateFilter } from './DateFilter/DateFilter';
import { StarsFilter } from './StarsFilter';
import { LanguageFilter } from './LanguageFilter';

interface FiltersProps {
  dateFilter: DateFilterState;
  dateType: 'exact' | 'after';
  stars: number;
  language: string;
  customInputValue: string;
  absoluteDateValue: string;
  getDateFilterDisplay: () => string;
  onPresetSelect: (preset: DatePreset) => void;
  onCustomInputChange: (value: string) => void;
  onAbsoluteDateChange: (dateStr: string) => void;
  onDateTypeChange: (type: 'exact' | 'after') => void;
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
  getDateFilterDisplay,
  onPresetSelect,
  onCustomInputChange,
  onAbsoluteDateChange,
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
        getDateFilterDisplay={getDateFilterDisplay}
        onPresetSelect={onPresetSelect}
        onCustomInputChange={onCustomInputChange}
        onAbsoluteDateChange={onAbsoluteDateChange}
        onDateTypeChange={onDateTypeChange}
      />
      <StarsFilter value={stars} onChange={onStarsChange} />
      <LanguageFilter value={language} onChange={onLanguageChange} />
    </div>
  );
}


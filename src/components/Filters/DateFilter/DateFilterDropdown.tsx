import type { DateFilterState, DatePreset } from '../../../types';

interface DateFilterDropdownProps {
  dateFilter: DateFilterState;
  dateType: 'exact' | 'after';
  customInputValue: string;
  absoluteDateValue: string;
  onPresetSelect: (preset: DatePreset) => void;
  onCustomInputChange: (value: string) => void;
  onAbsoluteDateChange: (dateStr: string) => void;
  onDateTypeChange: (type: 'exact' | 'after') => void;
}

const PRESETS: DatePreset[] = ['1h', '1d', '7d', '14d', '30d', '90d'];
const PRESET_LABELS: Record<DatePreset, string> = {
  '1h': '1 hour ago',
  '1d': '1 day ago',
  '7d': '7 days ago',
  '14d': '14 days ago',
  '30d': '30 days ago',
  '90d': '90 days ago',
};

export function DateFilterDropdown({
  dateFilter,
  dateType,
  customInputValue,
  absoluteDateValue,
  onPresetSelect,
  onCustomInputChange,
  onAbsoluteDateChange,
  onDateTypeChange,
}: DateFilterDropdownProps) {
  const handlePresetClick = (preset: DatePreset) => {
    onPresetSelect(preset);
  };

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onCustomInputChange(e.target.value);
  };

  const handleAbsoluteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onAbsoluteDateChange(e.target.value);
  };

  return (
    <div className="date-filter-dropdown">
      <div className="date-filter-header">
        <span>Filter Time Range</span>
      </div>
      <div className="date-filter-type-toggle">
        <button
          type="button"
          className={`date-type-toggle ${dateType === 'after' ? 'active' : ''}`}
          onClick={() => onDateTypeChange('after')}
        >
          Created after
        </button>
        <button
          type="button"
          className={`date-type-toggle ${dateType === 'exact' ? 'active' : ''}`}
          onClick={() => onDateTypeChange('exact')}
        >
          Created on
        </button>
      </div>
      <div className="date-filter-presets">
        {PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            className={`date-filter-preset ${dateFilter.type === 'preset' && dateFilter.preset === preset ? 'active' : ''}`}
            onClick={() => handlePresetClick(preset)}
          >
            {PRESET_LABELS[preset]}
          </button>
        ))}
      </div>
      <div className="date-filter-custom">
        <label>Custom range: 7d, 2w, 1m...</label>
        <input
          type="text"
          value={customInputValue}
          onChange={handleCustomChange}
          placeholder="7d, 2w, 1m..."
          className="date-filter-custom-input"
          onClick={(e) => {
            e.stopPropagation();
          }}
        />
      </div>
      <div className="date-filter-absolute">
        <label>Absolute date:</label>
        <input
          type="date"
          value={absoluteDateValue}
          onChange={handleAbsoluteChange}
          className="date-filter-date-input"
          onClick={(e) => {
            e.stopPropagation();
          }}
        />
      </div>
    </div>
  );
}


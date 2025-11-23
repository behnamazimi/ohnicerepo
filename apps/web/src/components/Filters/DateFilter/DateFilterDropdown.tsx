import type { DateFilterState, DatePreset } from '@ohnicerepo/shared';

interface DateFilterDropdownProps {
  dateFilter: DateFilterState;
  dateType: 'exact' | 'after' | 'range';
  customInputValue: string;
  absoluteDateValue: string;
  startDateValue: string;
  endDateValue: string;
  tempStartDateValue: string;
  tempEndDateValue: string;
  onPresetSelect: (preset: DatePreset) => void;
  onCustomInputChange: (value: string) => void;
  onAbsoluteDateChange: (dateStr: string) => void;
  onTempDateRangeChange: (startDate: string, endDate: string) => void;
  onApplyDateRange: () => boolean;
  onDateTypeChange: (type: 'exact' | 'after' | 'range') => void;
}

const PRESETS: DatePreset[] = ['1h', '1d', '7d', '14d', '30d', '90d'];
const PRESET_LABELS: Record<DatePreset, string> = {
  '1h': 'an hour ago',
  '1d': 'a day ago',
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
  tempStartDateValue,
  tempEndDateValue,
  onPresetSelect,
  onCustomInputChange,
  onAbsoluteDateChange,
  onTempDateRangeChange,
  onApplyDateRange,
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

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onTempDateRangeChange(e.target.value, tempEndDateValue);
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onTempDateRangeChange(tempStartDateValue, e.target.value);
  };

  const handleApply = (e: React.MouseEvent) => {
    e.stopPropagation();
    const success = onApplyDateRange();
    return success;
  };

  const isApplyDisabled =
    !tempStartDateValue ||
    !tempEndDateValue ||
    new Date(tempStartDateValue) > new Date(tempEndDateValue);

  return (
    <div className="date-filter-dropdown">
      <div className="date-filter-type-toggle">
        <button
          type="button"
          className={`date-type-toggle ${dateType === 'after' ? 'active' : ''}`}
          onClick={() => onDateTypeChange('after')}
        >
          After Date
        </button>
        <button
          type="button"
          className={`date-type-toggle ${dateType === 'exact' ? 'active' : ''}`}
          onClick={() => onDateTypeChange('exact')}
        >
          Exact Date
        </button>
        <button
          type="button"
          className={`date-type-toggle ${dateType === 'range' ? 'active' : ''}`}
          onClick={() => onDateTypeChange('range')}
        >
          Date Range
        </button>
      </div>

      {/* Show presets for 'after' and 'exact' modes */}
      {(dateType === 'after' || dateType === 'exact') && (
        <>
          <div className="date-filter-section">
            <div className="date-filter-section-label">Quick Select</div>
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
          </div>

          {/* Custom input for 'after' mode */}
          {dateType === 'after' && (
            <div className="date-filter-section">
              <div className="date-filter-section-label">Custom Range</div>
              <div className="date-filter-custom">
                <input
                  type="text"
                  value={customInputValue}
                  onChange={handleCustomChange}
                  placeholder="e.g., 7d, 2w, 1m"
                  className="date-filter-custom-input"
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                />
                <div className="date-filter-helper-text">
                  Enter days (7d), weeks (2w), or months (1m)
                </div>
              </div>
            </div>
          )}

          {/* Absolute date for 'exact' mode */}
          {dateType === 'exact' && (
            <div className="date-filter-section">
              <div className="date-filter-section-label">Select Date</div>
              <div className="date-filter-absolute">
                <input
                  type="date"
                  value={absoluteDateValue}
                  onChange={handleAbsoluteChange}
                  className="date-filter-date-input"
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                />
                <div className="date-filter-helper-text">Pick a specific date</div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Date range mode */}
      {dateType === 'range' && (
        <div className="date-filter-section">
          <div className="date-filter-section-label">Select Date Range</div>
          <div className="date-filter-range">
            <div className="date-range-inputs">
              <div className="date-range-input-group">
                <label className="date-range-input-label">From</label>
                <input
                  type="date"
                  value={tempStartDateValue}
                  onChange={handleStartDateChange}
                  className="date-filter-date-input"
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                />
              </div>
              <span className="date-range-separator">to</span>
              <div className="date-range-input-group">
                <label className="date-range-input-label">To</label>
                <input
                  type="date"
                  value={tempEndDateValue}
                  onChange={handleEndDateChange}
                  className="date-filter-date-input"
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                />
              </div>
            </div>
            <button
              type="button"
              className="date-range-apply-button"
              onClick={handleApply}
              disabled={isApplyDisabled}
            >
              Apply Filter
            </button>
            {isApplyDisabled && tempStartDateValue && tempEndDateValue && (
              <div className="date-range-error-text">
                Start date must be before or equal to end date
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

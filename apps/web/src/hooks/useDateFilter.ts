import { useState, useCallback } from 'react';
import type { DateFilterState, DatePreset } from '@ohnicerepo/shared';
import { parseCustomDate, calculateDaysFromDate } from '../utils/date';

const PRESET_DAYS_MAP: Record<DatePreset, number> = {
  '1h': 0, // 1 hour ago - use 0 days (today)
  '1d': 1,
  '7d': 7,
  '14d': 14,
  '30d': 30,
  '90d': 90,
};

const PRESET_LABELS: Record<DatePreset, string> = {
  '1h': 'an hour ago',
  '1d': 'a day ago',
  '7d': '7 days ago',
  '14d': '14 days ago',
  '30d': '30 days ago',
  '90d': '90 days ago',
};

export function useDateFilter(initialDays: number = 7, initialState?: DateFilterState) {
  const getDefaultDateRange = () => {
    const today = new Date();
    const endDate = today.toISOString().split('T')[0]; // YYYY-MM-DD format

    // Default to 30 days ago for start date
    const startDateObj = new Date(today);
    startDateObj.setDate(startDateObj.getDate() - 30);
    const startDate = startDateObj.toISOString().split('T')[0]; // YYYY-MM-DD format

    return { startDate, endDate };
  };

  // If initial state is range type but missing dates, set defaults
  const getInitialState = (): DateFilterState => {
    if (initialState) {
      if (initialState.type === 'range' && (!initialState.startDate || !initialState.endDate)) {
        const { startDate, endDate } = getDefaultDateRange();
        return {
          ...initialState,
          startDate,
          endDate,
        };
      }
      return initialState;
    }
    return {
      type: 'preset',
      preset: '7d',
      days: initialDays,
    };
  };

  const resolvedInitialState = getInitialState();
  const [dateFilter, setDateFilter] = useState<DateFilterState>(resolvedInitialState);
  const [customInputValue, setCustomInputValue] = useState(resolvedInitialState.customValue ?? '');
  const [absoluteDateValue, setAbsoluteDateValue] = useState(
    resolvedInitialState.absoluteDate ?? ''
  );
  const [startDateValue, setStartDateValue] = useState(resolvedInitialState.startDate ?? '');
  const [endDateValue, setEndDateValue] = useState(resolvedInitialState.endDate ?? '');
  // Temporary values for date range inputs (before applying)
  const [tempStartDateValue, setTempStartDateValue] = useState(
    resolvedInitialState.startDate ?? ''
  );
  const [tempEndDateValue, setTempEndDateValue] = useState(resolvedInitialState.endDate ?? '');

  const handlePresetSelect = useCallback((preset: DatePreset) => {
    setDateFilter({
      type: 'preset',
      preset,
      days: PRESET_DAYS_MAP[preset],
    });
    setCustomInputValue('');
    setAbsoluteDateValue('');
    setStartDateValue('');
    setEndDateValue('');
  }, []);

  const handleCustomInputChange = useCallback((value: string) => {
    setCustomInputValue(value);
    const days = parseCustomDate(value);
    if (days !== null && days >= 0) {
      setDateFilter({
        type: 'custom',
        customValue: value,
        days,
      });
      setAbsoluteDateValue('');
      setStartDateValue('');
      setEndDateValue('');
    }
  }, []);

  const handleAbsoluteDateChange = useCallback((dateStr: string) => {
    setAbsoluteDateValue(dateStr);
    if (dateStr) {
      const days = calculateDaysFromDate(dateStr);
      setDateFilter({
        type: 'absolute',
        absoluteDate: dateStr,
        days,
      });
      setCustomInputValue('');
      setStartDateValue('');
      setEndDateValue('');
    }
  }, []);

  const handleDateRangeChange = useCallback((startDate: string, endDate: string) => {
    setStartDateValue(startDate);
    setEndDateValue(endDate);
    if (startDate && endDate) {
      // Calculate days from end date for backwards compatibility
      const days = calculateDaysFromDate(endDate);
      setDateFilter({
        type: 'range',
        startDate,
        endDate,
        days,
      });
      setCustomInputValue('');
      setAbsoluteDateValue('');
    }
  }, []);

  // Update temporary date range values (doesn't trigger search)
  const handleTempDateRangeChange = useCallback((startDate: string, endDate: string) => {
    setTempStartDateValue(startDate);
    setTempEndDateValue(endDate);
  }, []);

  // Apply the temporary date range values to the actual filter
  const applyDateRange = useCallback(() => {
    if (tempStartDateValue && tempEndDateValue) {
      // Validate that start date is before or equal to end date
      if (new Date(tempStartDateValue) > new Date(tempEndDateValue)) {
        return false; // Invalid range
      }
      handleDateRangeChange(tempStartDateValue, tempEndDateValue);
      return true;
    }
    return false;
  }, [tempStartDateValue, tempEndDateValue, handleDateRangeChange]);

  const handleDateTypeChangeToRange = useCallback(() => {
    // If switching to range mode and dates are empty, set defaults
    if (!startDateValue || !endDateValue) {
      const today = new Date();
      const endDate = today.toISOString().split('T')[0]; // YYYY-MM-DD format

      // Default to 30 days ago for start date
      const startDateObj = new Date(today);
      startDateObj.setDate(startDateObj.getDate() - 30);
      const startDate = startDateObj.toISOString().split('T')[0]; // YYYY-MM-DD format

      setTempStartDateValue(startDate);
      setTempEndDateValue(endDate);
      handleDateRangeChange(startDate, endDate);
    } else {
      // Sync temp values with current values
      setTempStartDateValue(startDateValue);
      setTempEndDateValue(endDateValue);
    }
  }, [startDateValue, endDateValue, handleDateRangeChange]);

  const getDateFilterDisplay = useCallback((): string => {
    if (dateFilter.type === 'preset') {
      return PRESET_LABELS[dateFilter.preset!];
    } else if (dateFilter.type === 'custom') {
      return customInputValue || 'Custom range';
    } else if (dateFilter.type === 'range') {
      if (startDateValue && endDateValue) {
        return `${new Date(startDateValue).toLocaleDateString()} - ${new Date(endDateValue).toLocaleDateString()}`;
      }
      return 'Select date range';
    } else {
      return absoluteDateValue ? new Date(absoluteDateValue).toLocaleDateString() : 'Select date';
    }
  }, [dateFilter, customInputValue, absoluteDateValue, startDateValue, endDateValue]);

  return {
    dateFilter,
    customInputValue,
    absoluteDateValue,
    startDateValue,
    endDateValue,
    tempStartDateValue,
    tempEndDateValue,
    handlePresetSelect,
    handleCustomInputChange,
    handleAbsoluteDateChange,
    handleDateRangeChange,
    handleTempDateRangeChange,
    applyDateRange,
    handleDateTypeChangeToRange,
    getDateFilterDisplay,
  };
}

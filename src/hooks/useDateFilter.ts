import { useState, useCallback } from 'react';
import type { DateFilterState, DatePreset } from '../types';
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
  '1h': '1 hour ago',
  '1d': '1 day ago',
  '7d': '7 days ago',
  '14d': '14 days ago',
  '30d': '30 days ago',
  '90d': '90 days ago',
};

export function useDateFilter(initialDays: number = 7, initialState?: DateFilterState) {
  const [dateFilter, setDateFilter] = useState<DateFilterState>(
    initialState ?? {
      type: 'preset',
      preset: '7d',
      days: initialDays,
    }
  );
  const [customInputValue, setCustomInputValue] = useState(initialState?.customValue ?? '');
  const [absoluteDateValue, setAbsoluteDateValue] = useState(initialState?.absoluteDate ?? '');

  const handlePresetSelect = useCallback((preset: DatePreset) => {
    setDateFilter({
      type: 'preset',
      preset,
      days: PRESET_DAYS_MAP[preset],
    });
    setCustomInputValue('');
    setAbsoluteDateValue('');
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
    }
  }, []);

  const getDateFilterDisplay = useCallback((): string => {
    if (dateFilter.type === 'preset') {
      return PRESET_LABELS[dateFilter.preset!];
    } else if (dateFilter.type === 'custom') {
      return customInputValue || 'Custom range';
    } else {
      return absoluteDateValue ? new Date(absoluteDateValue).toLocaleDateString() : 'Select date';
    }
  }, [dateFilter, customInputValue, absoluteDateValue]);

  return {
    dateFilter,
    customInputValue,
    absoluteDateValue,
    handlePresetSelect,
    handleCustomInputChange,
    handleAbsoluteDateChange,
    getDateFilterDisplay,
  };
}


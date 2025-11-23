import { useState, useEffect, useMemo } from 'react';
import './App.css';
import { Header } from './components/Header/Header';
import { Footer } from './components/Footer/Footer';
import { Filters } from './components/Filters/Filters';
import { ErrorMessage } from './components/ErrorMessage/ErrorMessage';
import { RepoList } from './components/RepoList/RepoList';
import { Pagination } from './components/Pagination/Pagination';
import { useRepos } from './hooks/useRepos';
import { useDateFilter } from './hooks/useDateFilter';
import { loadPersistedFilters, savePersistedFilters } from './utils/persistence';
import type { LanguageOption } from '@ohnicerepo/shared';

function App() {
  // Load persisted filters once on mount
  const persisted = useMemo(() => loadPersistedFilters(), []);

  const [stars, setStars] = useState(persisted?.stars ?? 100);
  const [language, setLanguage] = useState(persisted?.language ?? '');
  const [dateType, setDateType] = useState<'exact' | 'after' | 'range'>(
    persisted?.dateType ?? 'exact'
  );
  const [page, setPage] = useState(1);
  const perPage = 100;

  const {
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
    handleTempDateRangeChange,
    applyDateRange,
    handleDateTypeChangeToRange,
    getDateFilterDisplay,
  } = useDateFilter(persisted?.dateFilter?.days ?? 7, persisted?.dateFilter);

  // Save filters to localStorage whenever they change
  useEffect(() => {
    savePersistedFilters({
      dateFilter,
      stars,
      language,
      dateType,
    });
  }, [dateFilter, stars, language, dateType]);

  const { data, loading, error, rateLimit, refetch } = useRepos({
    days: dateFilter.days,
    stars,
    page,
    perPage,
    language: language.trim(),
    dateType,
    startDate: dateFilter.startDate,
    endDate: dateFilter.endDate,
  });

  const handleStarsChange = (value: number) => {
    setStars(value);
    setPage(1);
  };

  const handleLanguageChange = (selectedOption: LanguageOption | null) => {
    setLanguage(selectedOption ? selectedOption.value : '');
    setPage(1);
  };

  const handleDateTypeChange = (newType: 'exact' | 'after' | 'range') => {
    setDateType(newType);
    // Set default dates when switching to range mode
    if (newType === 'range' && (!startDateValue || !endDateValue)) {
      handleDateTypeChangeToRange();
    }
    setPage(1);
  };

  const handlePresetSelectWithPageReset = (preset: Parameters<typeof handlePresetSelect>[0]) => {
    handlePresetSelect(preset);
    setPage(1);
  };

  const handleCustomInputChangeWithPageReset = (value: string) => {
    handleCustomInputChange(value);
    setPage(1);
  };

  const handleAbsoluteDateChangeWithPageReset = (dateStr: string) => {
    handleAbsoluteDateChange(dateStr);
    setPage(1);
  };

  const handleTempDateRangeChangeWithPageReset = (startDate: string, endDate: string) => {
    handleTempDateRangeChange(startDate, endDate);
  };

  const handleApplyDateRangeWithPageReset = (): boolean => {
    const success = applyDateRange();
    if (success) {
      setPage(1);
    }
    return success;
  };

  return (
    <div className="app">
      <Header />

      <Filters
        dateFilter={dateFilter}
        dateType={dateType}
        stars={stars}
        language={language}
        customInputValue={customInputValue}
        absoluteDateValue={absoluteDateValue}
        startDateValue={startDateValue}
        endDateValue={endDateValue}
        tempStartDateValue={tempStartDateValue}
        tempEndDateValue={tempEndDateValue}
        getDateFilterDisplay={getDateFilterDisplay}
        onPresetSelect={handlePresetSelectWithPageReset}
        onCustomInputChange={handleCustomInputChangeWithPageReset}
        onAbsoluteDateChange={handleAbsoluteDateChangeWithPageReset}
        onTempDateRangeChange={handleTempDateRangeChangeWithPageReset}
        onApplyDateRange={handleApplyDateRangeWithPageReset}
        onDateTypeChange={handleDateTypeChange}
        onStarsChange={handleStarsChange}
        onLanguageChange={handleLanguageChange}
      />

      {loading && (
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading repositories...</p>
        </div>
      )}

      {error && <ErrorMessage error={error} onRetry={refetch} />}

      {data && !loading && (
        <>
          <RepoList data={data} />
          <Pagination currentPage={page} totalPages={data.totalPages} onPageChange={setPage} />
        </>
      )}

      <Footer rateLimit={rateLimit} />
    </div>
  );
}

export default App;

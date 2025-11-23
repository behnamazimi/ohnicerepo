import Select from 'react-select';
import { PROGRAMMING_LANGUAGES } from '../../constants/languages';
import type { LanguageOption } from '@ohnicerepo/shared';

interface LanguageFilterProps {
  value: string;
  onChange: (selectedOption: LanguageOption | null) => void;
}

export function LanguageFilter({ value, onChange }: LanguageFilterProps) {
  return (
    <div className="filter-group">
      <label htmlFor="language">Language:</label>
      <Select
        id="language"
        options={PROGRAMMING_LANGUAGES}
        value={value ? PROGRAMMING_LANGUAGES.find((l) => l.value === value) : null}
        onChange={onChange}
        isClearable
        isSearchable
        placeholder="Language..."
        className="language-select"
        classNamePrefix="language-select"
        styles={{
          control: (base) => ({
            ...base,
            fontFamily: 'var(--font-mono)',
            backgroundColor: 'var(--bg-tertiary)',
            borderColor: 'var(--border-color)',
            borderWidth: '2px',
            borderRadius: 'var(--radius-md)',
            minHeight: '42px',
            height: '42px',
            boxSizing: 'border-box',
            '&:hover': {
              borderColor: 'var(--accent-secondary)',
            },
          }),
          menu: (base) => ({
            ...base,
            backgroundColor: 'var(--bg-tertiary)',
            border: '2px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            zIndex: 10001,
          }),
          option: (base, state) => ({
            ...base,
            backgroundColor: state.isFocused
              ? 'var(--bg-secondary)'
              : state.isSelected
                ? 'var(--accent-primary)'
                : 'var(--bg-primary)',
            color: state.isSelected ? 'var(--bg-primary)' : 'var(--text-primary)',
            '&:hover': {
              backgroundColor: 'var(--bg-secondary)',
            },
          }),
          indicatorSeparator: () => ({
            display: 'none',
          }),
          input: (base) => ({
            ...base,
            color: 'var(--text-primary)',
          }),
          singleValue: (base) => ({
            ...base,
            color: 'var(--text-primary)',
          }),
          placeholder: (base) => ({
            ...base,
            color: 'var(--text-muted)',
            opacity: 0.6,
          }),
        }}
      />
    </div>
  );
}

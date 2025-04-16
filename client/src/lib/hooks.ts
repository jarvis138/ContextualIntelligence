import { useMemo, useState, useEffect } from 'react';
import { useLocation } from 'wouter';

/**
 * Custom hook to get URL search parameters
 * @returns Object with the URL search parameters
 */
export function useSearchParams(): URLSearchParams {
  const [location] = useLocation();
  return useMemo(() => {
    // Get everything after the ? character
    const queryString = location.includes('?') 
      ? location.substr(location.indexOf('?') + 1) 
      : '';
    
    return new URLSearchParams(queryString);
  }, [location]);
}

/**
 * Custom hook to handle pagination
 * @param initialPage Initial page number
 * @param initialPageSize Initial page size
 * @returns Object with pagination state and handlers
 */
export function usePagination(initialPage = 1, initialPageSize = 10) {
  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);
  
  const resetPagination = () => {
    setPage(1);
  };
  
  return {
    page,
    pageSize,
    setPage,
    setPageSize,
    resetPagination
  };
}

/**
 * Custom hook to handle sorting
 * @param initialSortField Initial sort field
 * @param initialSortDirection Initial sort direction
 * @returns Object with sorting state and handlers
 */
export function useSorting(initialSortField = 'id', initialSortDirection = 'asc') {
  const [sortField, setSortField] = useState(initialSortField);
  const [sortDirection, setSortDirection] = useState(initialSortDirection);
  
  const toggleSortDirection = () => {
    setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
  };
  
  const setSorting = (field: string) => {
    if (field === sortField) {
      toggleSortDirection();
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };
  
  return {
    sortField,
    sortDirection,
    setSorting
  };
}

/**
 * Custom hook to handle debounced values
 * @param value Value to debounce
 * @param delay Delay in milliseconds
 * @returns Debounced value
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    
    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);
  
  return debouncedValue;
}

/**
 * Custom hook to handle local storage state
 * @param key Local storage key
 * @param initialValue Initial value
 * @returns [value, setValue] tuple
 */
export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });
  
  const setValue = (value: T) => {
    try {
      setStoredValue(value);
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(error);
    }
  };
  
  return [storedValue, setValue];
}
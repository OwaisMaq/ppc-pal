import { useState, useMemo, useCallback } from 'react';

interface PaginationOptions {
  itemsPerPage?: number;
  initialPage?: number;
}

interface PaginationResult<T> {
  data: T[];
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  totalItems: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  goToPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  setItemsPerPage: (items: number) => void;
}

export function usePagination<T>(
  data: T[],
  { itemsPerPage: initialItemsPerPage = 50, initialPage = 1 }: PaginationOptions = {}
): PaginationResult<T> {
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [itemsPerPage, setItemsPerPageState] = useState(initialItemsPerPage);
  
  const totalPages = Math.max(1, Math.ceil(data.length / itemsPerPage));
  
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return data.slice(start, end);
  }, [data, currentPage, itemsPerPage]);
  
  const goToPage = useCallback((page: number) => {
    const validPage = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(validPage);
  }, [totalPages]);
  
  const nextPage = useCallback(() => {
    goToPage(currentPage + 1);
  }, [currentPage, goToPage]);
  
  const prevPage = useCallback(() => {
    goToPage(currentPage - 1);
  }, [currentPage, goToPage]);

  const setItemsPerPage = useCallback((items: number) => {
    setItemsPerPageState(items);
    setCurrentPage(1);
  }, []);
  
  return {
    data: paginatedData,
    currentPage,
    totalPages,
    itemsPerPage,
    totalItems: data.length,
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1,
    goToPage,
    nextPage,
    prevPage,
    setItemsPerPage,
  };
}

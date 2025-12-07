import { useCallback } from "react";
import { useGenerations } from "./hooks";
import { GenerationsHeader } from "./GenerationsHeader";
import { GenerationsTable } from "./GenerationsTable";
import { Pagination } from "./Pagination";
import { LoadingState } from "./LoadingState";
import { EmptyState } from "./EmptyState";
import { ErrorState } from "./ErrorState";

/**
 * Główny komponent kontenerowy widoku historii generacji.
 * Zarządza stanem całej listy, obsługuje pobieranie danych z API,
 * koordynuje wyświetlanie stanów ładowania, błędów i pustej listy.
 */
export function GenerationsView() {
  const {
    generations,
    pagination,
    sortOrder,
    isLoading,
    error,
    setPage,
    setLimit,
    setSortOrder,
    refresh,
    clearError,
  } = useGenerations();

  // Handler ponowienia próby po błędzie
  const handleRetry = useCallback(() => {
    clearError();
    refresh();
  }, [clearError, refresh]);

  // Stan ładowania (tylko przy pierwszym ładowaniu)
  if (isLoading && generations.length === 0) {
    return (
      <>
        <GenerationsHeader />
        <LoadingState rowCount={5} />
      </>
    );
  }

  // Stan błędu (gdy nie ma danych)
  if (error && generations.length === 0) {
    return (
      <>
        <GenerationsHeader />
        <ErrorState error={error} onRetry={handleRetry} />
      </>
    );
  }

  // Stan pustej listy
  if (!isLoading && generations.length === 0) {
    return (
      <>
        <GenerationsHeader />
        <EmptyState />
      </>
    );
  }

  // Stan z danymi
  return (
    <>
      <GenerationsHeader />

      <GenerationsTable
        generations={generations}
        sortOrder={sortOrder}
        onSortOrderChange={setSortOrder}
      />

      <Pagination
        page={pagination.page}
        limit={pagination.limit}
        total={pagination.total}
        onPageChange={setPage}
        onLimitChange={setLimit}
        isLoading={isLoading}
      />
    </>
  );
}

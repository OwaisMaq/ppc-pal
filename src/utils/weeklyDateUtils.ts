
export const getWeeklyDateRanges = () => {
  const today = new Date();
  const last7DaysStart = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const previous7DaysStart = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000);
  const previous7DaysEnd = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

  return {
    today,
    last7DaysStart,
    previous7DaysStart,
    previous7DaysEnd
  };
};

export const formatDateForQuery = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

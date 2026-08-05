interface WeekRange {
  weekKey: string;
  start: Date;
  end: Date;
}

function formatDateKey(date: Date): string {
  const year = date.getFullYear();

  const month = String(date.getMonth() + 1).padStart(2, "0");

  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function getWeekRange(referenceDate = new Date()): WeekRange {
  const date = new Date(referenceDate);

  /*
   * O servidor deve trabalhar considerando
   * America/Fortaleza.
   *
   * Domingo é o primeiro dia da semana.
   */
  date.setHours(0, 0, 0, 0);

  const start = new Date(date);

  start.setDate(date.getDate() - date.getDay());

  start.setHours(0, 0, 0, 0);

  const end = new Date(start);

  end.setDate(start.getDate() + 7);

  return {
    weekKey: formatDateKey(start),
    start,
    end,
  };
}

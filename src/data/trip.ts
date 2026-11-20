/** Trip-wide facts that don't belong to a single country. */
export const trip = {
  start: new Date('2016-04-11'),
  end: new Date('2016-08-18'),
  /** Where the journey started and ended (first point of the map route). */
  home: { name: 'Edinburgh', coords: [56, -3] as [number, number] },
} as const;

const DAY = 24 * 60 * 60 * 1000;
export const tripDays = Math.round((trip.end.getTime() - trip.start.getTime()) / DAY) + 1;

// Moments come in UTC; pages show them in the owner's time zone, whatever the browser's is.
const ownerTimeZone = "Europe/Moscow";
// The caption naming that zone, shown next to the times; the spec fixes it as text, not Intl output.
export const ownerTimeZoneCaption = "Московское время (UTC+3)";

// «10:00».
export const clockTime = new Intl.DateTimeFormat("ru", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: ownerTimeZone,
});

// «пт, 20 ноября».
export const longDay = new Intl.DateTimeFormat("ru", {
  weekday: "short",
  day: "numeric",
  month: "long",
  timeZone: ownerTimeZone,
});

// «27.03.2026, 14:40».
export const dateTime = new Intl.DateTimeFormat("ru", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: ownerTimeZone,
});

// «10:00–11:00».
export const timeRange = ({ start, end }: { start: string; end: string }) =>
  `${clockTime.format(new Date(start))}–${clockTime.format(new Date(end))}`;

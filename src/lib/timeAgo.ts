export function timeSince(dateInput: Date | string | number): string {
  const date = new Date(dateInput);

  if (isNaN(date.getTime())) {
    return "invalid date";
  }

  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  if (seconds < 0) return "0 seconds"; 

  const intervals = [
    { label: "year", seconds: 31536000 },
    { label: "month", seconds: 2592000 },
    { label: "day", seconds: 86400 },
    { label: "hour", seconds: 3600 },
    { label: "minute", seconds: 60 }
  ];

  for (const interval of intervals) {
    const value = Math.floor(seconds / interval.seconds);
    if (value >= 1) {
      return `${value} ${interval.label}${value > 1 ? "s" : ""}`;
    }
  }

  const secValue = Math.floor(seconds);
  return `${secValue} second${secValue !== 1 ? "s" : ""}`;
}

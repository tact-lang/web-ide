export const formatTimestamp = (timestamp: string | number | Date): string => {
  if (!timestamp) return '\x1b[0m \x1b[0m';
  const date = new Date(timestamp);
  return date.toLocaleTimeString();
};

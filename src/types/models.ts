export type Flight = {
  id: string;
  flightNumber: string;
  airline: string;
  from: string;
  gate?: string;
  time?: string;
  status?: string;   // e.g. "Boarding", "On Time"
};

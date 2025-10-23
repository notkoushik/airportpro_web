/**
 * IATA Bar Coded Boarding Pass (BCBP) Data Structure
 * Based on IATA Resolution 792
 */

export interface BoardingPassData {
  // Format
  formatCode: string; // 'M' for mobile/multiple legs
  numberOfLegs: number;
  
  // Passenger
  passengerName: string;
  
  // Electronic Ticket
  electronicTicketIndicator?: string;
  
  // Legs (can be multiple)
  legs: BoardingPassLeg[];
  
  // Security
  securityDataType?: string;
  securityData?: string;
  
  // Raw data
  rawData: string;
}

export interface BoardingPassLeg {
  // Operating Carrier PNR Code
  pnr: string;
  
  // From/To
  fromCity: string;
  toCity: string;
  
  // Operating Carrier Designator
  operatingCarrier: string;
  
  // Flight Number
  flightNumber: string;
  
  // Date of Flight (Julian Date)
  flightDate: string;
  flightDateFormatted: string; // Converted to DD/MM/YYYY
  
  // Compartment Code
  compartmentCode: string;
  
  // Seat Number
  seatNumber: string;
  
  // Check-in Sequence Number
  sequenceNumber: string;
  
  // Passenger Status
  passengerStatus: string;
  
  // Optional fields
  airlineNumericCode?: string;
  documentFormSerialNumber?: string;
  selecteeIndicator?: string;
  internationalDocVerification?: string;
  marketingCarrier?: string;
  frequentFlyerNumber?: string;
  airlineBagTag?: string;
  fastTrack?: string;
}

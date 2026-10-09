export interface Coordinate {
  lat: number;
  lng: number;
}

export interface ZoneOrder {
  id: number;
  zoneId: number;
  orderNumber: number;
  description: string;
  latitude: number;
  longitude: number;
  status: 'pending' | 'delivered';
}

export interface ZoneDriver {
  id: number;
  name: string;
  email: string;
  vehiclePlate?: string | null;
  vehicleModel?: string | null;
}

export interface Zone {
  id: number;
  name: string;
  color: string;
  polygon: Coordinate[];
  driver: ZoneDriver;
  vehicle: {
    plate: string;
    model: string;
  };
  orders: ZoneOrder[];
}

export interface CreateZoneRequest {
  name: string;
  color?: string;
  polygon: Coordinate[];
  driverId: number;
  vehiclePlate: string;
  vehicleModel: string;
}

export interface CreateZoneOrderRequest {
  description: string;
  latitude: number;
  longitude: number;
}

export interface BulkOrderExtraData {
  orderNumber?: string;
  trackingNumber?: string;
  customer?: string;
  phone?: string;
  address?: string;
  municipality?: string;
  weight?: string;
  statusOriginal?: string;
  [key: string]: any;
}

export interface BulkOrderRow {
  rowIndex: number;
  description: string;
  latitude: number;
  longitude: number;
  zoneHint?: string;
  extraData?: BulkOrderExtraData | null;
  status: 'matched' | 'unassigned' | 'error';
  error?: string | null;
  zoneId?: number | null;
  zoneName?: string | null;
  zoneColor?: string | null;
  driverName?: string | null;
  vehiclePlate?: string | null;
}

export interface BulkZoneSummary {
  zoneId: number;
  zoneName: string;
  zoneColor: string;
  driverName: string;
  vehiclePlate: string;
  currentOrdersCount: number;
  newOrdersCount: number;
  capacityLimit: number;
  capacityAvailable: number;
  willExceed: boolean;
}

export interface BulkPreviewData {
  summary: {
    total: number;
    matched: number;
    unassigned: number;
    errors: number;
    byZone: BulkZoneSummary[];
  };
  orders: BulkOrderRow[];
}

export interface BulkImportResponse {
  totalImported: number;
  unassignedCount: number;
  errorCount: number;
  byZone: Array<{
    zoneId: number;
    zoneName: string;
    importedCount: number;
    totalOrdersNow: number;
  }>;
  unassignedOrders: BulkOrderRow[];
}
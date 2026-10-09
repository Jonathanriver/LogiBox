import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse, Item, HealthStatus } from '../models/item.model';
import {
  CreateZoneOrderRequest,
  CreateZoneRequest,
  Zone,
  ZoneDriver,
  ZoneOrder,
  BulkPreviewData,
  BulkImportResponse
} from '../models/zone.model';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private http = inject(HttpClient);
  
  // Si se ejecuta en ng serve (puerto 4200), apunta al backend en localhost:3000
  // En producción (hosting unificado), utiliza la ruta relativa /api
  private apiUrl = typeof window !== 'undefined' && window.location.port === '4200'
    ? 'http://localhost:3000/api'
    : '/api';

  getHealth(): Observable<HealthStatus> {
    return this.http.get<HealthStatus>(`${this.apiUrl}/health`);
  }

  getItems(): Observable<ApiResponse<Item[]>> {
    return this.http.get<ApiResponse<Item[]>>(`${this.apiUrl}/items`);
  }

  createItem(item: { title: string; category?: string }): Observable<ApiResponse<Item>> {
    return this.http.post<ApiResponse<Item>>(`${this.apiUrl}/items`, item);
  }

  toggleItem(id: number): Observable<ApiResponse<Item>> {
    return this.http.patch<ApiResponse<Item>>(`${this.apiUrl}/items/${id}/toggle`, {});
  }

  deleteItem(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/items/${id}`);
  }

  getZones(): Observable<ApiResponse<Zone[]>> {
    return this.http.get<ApiResponse<Zone[]>>(`${this.apiUrl}/zones`);
  }

  getMyZones(): Observable<ApiResponse<Zone[]>> {
    return this.http.get<ApiResponse<Zone[]>>(`${this.apiUrl}/zones/my`);
  }

  getZoneDrivers(): Observable<ApiResponse<ZoneDriver[]>> {
    return this.http.get<ApiResponse<ZoneDriver[]>>(`${this.apiUrl}/zones/drivers`);
  }

  createZone(zone: CreateZoneRequest): Observable<ApiResponse<{ id: number }>> {
    return this.http.post<ApiResponse<{ id: number }>>(`${this.apiUrl}/zones`, zone);
  }

  updateZone(zoneId: number, zone: CreateZoneRequest): Observable<ApiResponse<{ id: number }>> {
    return this.http.patch<ApiResponse<{ id: number }>>(`${this.apiUrl}/zones/${zoneId}`, zone);
  }

  deleteZone(zoneId: number): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.apiUrl}/zones/${zoneId}`);
  }

  addZoneOrder(zoneId: number, order: CreateZoneOrderRequest): Observable<ApiResponse<ZoneOrder>> {
    return this.http.post<ApiResponse<ZoneOrder>>(`${this.apiUrl}/zones/${zoneId}/orders`, order);
  }

  updateMyZoneOrderStatus(orderId: number, status: ZoneOrder['status']): Observable<ApiResponse<Pick<ZoneOrder, 'id' | 'status'>>> {
    return this.http.patch<ApiResponse<Pick<ZoneOrder, 'id' | 'status'>>>(
      `${this.apiUrl}/zones/orders/${orderId}/status`,
      { status }
    );
  }

  downloadBulkTemplate(): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/zones/bulk-template`, {
      responseType: 'blob'
    });
  }

  previewBulkOrders(payload: FormData | { orders: any[] }): Observable<ApiResponse<BulkPreviewData>> {
    return this.http.post<ApiResponse<BulkPreviewData>>(`${this.apiUrl}/zones/orders/bulk-preview`, payload);
  }

  importBulkOrders(payload: FormData | { orders: any[] }): Observable<ApiResponse<BulkImportResponse>> {
    return this.http.post<ApiResponse<BulkImportResponse>>(`${this.apiUrl}/zones/orders/bulk-import`, payload);
  }
}


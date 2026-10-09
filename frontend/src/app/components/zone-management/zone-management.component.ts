import { AfterViewInit, Component, ElementRef, Input, NgZone, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GeoJSONSource, LngLatBounds, Map as MapLibreMap, NavigationControl, setWorkerUrl } from 'maplibre-gl';
import type { Feature, FeatureCollection } from 'geojson';
import { ApiService } from '../../services/api.service';
import { Coordinate, Zone, ZoneDriver, ZoneOrder } from '../../models/zone.model';

interface ZoneDraft {
  name: string;
  driverId: number | null;
  vehiclePlate: string;
  vehicleModel: string;
}

@Component({
  selector: 'app-zone-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './zone-management.component.html',
  styleUrl: './zone-management.component.css'
})
export class ZoneManagementComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() canManage = false;
  @ViewChild('mapCanvas') private mapCanvas?: ElementRef<HTMLDivElement>;

  private api = inject(ApiService);
  private zone = inject(NgZone);
  private map?: MapLibreMap;
  private resizeObserver?: ResizeObserver;
  private mapLoaded = false;

  zones: Zone[] = [];
  drivers: ZoneDriver[] = [];
  draftPoints: Coordinate[] = [];
  selectedZoneId: number | null = null;
  search = '';
  isLoading = true;
  isSavingZone = false;
  isSavingOrder = false;
  isPickingOrderPoint = false;
  isDrawingZone = false;
  errorMessage = '';
  successMessage = '';
  showZoneDialog = false;
  pendingPolygon: Coordinate[] | null = null;
  zoneDraft: ZoneDraft = this.emptyZoneDraft();
  orderDraft = { description: '', latitude: '', longitude: '' };
  editingZoneId: number | null = null;

  get selectedZone(): Zone | undefined {
    return this.zones.find(zone => zone.id === this.selectedZoneId);
  }

  get filteredZones(): Zone[] {
    const query = this.search.trim().toLowerCase();
    if (!query) return this.zones;
    return this.zones.filter(zone =>
      zone.name.toLowerCase().includes(query)
      || zone.driver.name.toLowerCase().includes(query)
      || zone.vehicle.plate.toLowerCase().includes(query)
      || zone.orders.some(order => order.description.toLowerCase().includes(query))
    );
  }

  get totalOrders(): number {
    return this.zones.reduce((total, zone) => total + zone.orders.length, 0);
  }

  get canAddOrder(): boolean {
    return this.canManage && !!this.selectedZone && this.selectedZone.orders.length < 200;
  }

  ngOnInit(): void {
    this.loadZones();
    if (this.canManage) this.loadDrivers();
  }

  ngAfterViewInit(): void {
    if (!this.mapCanvas) return;

    setWorkerUrl('/assets/maplibre/maplibre-gl-worker.mjs');
    this.map = new MapLibreMap({
      container: this.mapCanvas.nativeElement,
      style: 'https://tiles.openfreemap.org/styles/liberty',
      center: [-74.08, 4.65],
      zoom: 11,
      maxZoom: 18,
      cooperativeGestures: true
    });
    this.map.addControl(new NavigationControl({ visualizePitch: false }), 'top-left');

    this.map.on('load', () => {
      this.mapLoaded = true;
      this.renderZones();
    });

    this.map.on('click', event => {
      this.zone.run(() => {
        if (this.isDrawingZone) {
          if (this.draftPoints.length < 100) {
            this.draftPoints.push({ lat: event.lngLat.lat, lng: event.lngLat.lng });
            this.renderZones();
          }
          return;
        }
        if (this.isPickingOrderPoint) this.setOrderPoint(event.lngLat.lat, event.lngLat.lng);
        if (!this.isDrawingZone && !this.isPickingOrderPoint && this.mapLoaded) {
          const features = this.map?.queryRenderedFeatures(event.point, { layers: ['zone-fills'] }) || [];
          const zoneId = Number(features[0]?.properties?.['zoneId']);
          if (Number.isInteger(zoneId) && zoneId !== this.selectedZoneId) this.selectZone(zoneId);
        }
      });
    });

    this.map.on('mousemove', event => {
      if (!this.map || !this.mapLoaded || this.isDrawingZone || this.isPickingOrderPoint) return;
      const features = this.map.queryRenderedFeatures(event.point, { layers: ['zone-fills'] });
      this.map.getCanvas().style.cursor = features.length ? 'pointer' : '';
    });

    this.map.on('error', event => {
      if (!this.mapLoaded && event.error) {
        this.zone.run(() => this.errorMessage = 'No se pudo cargar el mapa vectorial. Verifica la conexión e inténtalo de nuevo.');
      }
    });

    this.zone.runOutsideAngular(() => {
      this.resizeObserver = new ResizeObserver(() => {
        this.map?.resize();
      });
      this.resizeObserver.observe(this.mapCanvas!.nativeElement);
    });
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    this.map?.remove();
    this.map = undefined;
    this.mapLoaded = false;
  }

  beginZoneDrawing(): void {
    if (!this.canManage || !this.map) return;
    this.errorMessage = '';
    this.successMessage = '';
    this.selectedZoneId = null;
    this.isPickingOrderPoint = false;
    this.isDrawingZone = true;
    this.editingZoneId = null;
    this.draftPoints = [];
    this.renderZones();
  }

  finishZoneDrawing(): void {
    if (this.draftPoints.length < 3) {
      this.errorMessage = 'Añade al menos tres puntos para cerrar el límite de la zona.';
      return;
    }
    this.pendingPolygon = [...this.draftPoints];
    this.isDrawingZone = false;
    this.showZoneDialog = true;
    if (!this.editingZoneId) this.zoneDraft = this.emptyZoneDraft();
    this.errorMessage = '';
    this.renderZones();
  }

  cancelZoneDrawing(): void {
    this.isDrawingZone = false;
    this.draftPoints = [];
    if (this.editingZoneId) {
      const zone = this.zones.find(candidate => candidate.id === this.editingZoneId);
      this.pendingPolygon = zone?.polygon.map(point => ({ ...point })) || null;
      this.showZoneDialog = true;
    }
    this.errorMessage = '';
    this.renderZones();
  }

  selectZone(zoneId: number): void {
    this.selectedZoneId = zoneId;
    this.isPickingOrderPoint = false;
    this.errorMessage = '';
    this.successMessage = '';
    this.renderZones(true);
  }

  selectDriver(driverId: number | null): void {
    this.zoneDraft.driverId = driverId;
    const driver = this.drivers.find(candidate => candidate.id === Number(driverId));
    this.zoneDraft.vehiclePlate = driver?.vehiclePlate || '';
    this.zoneDraft.vehicleModel = driver?.vehicleModel || '';
  }

  editSelectedZone(): void {
    const zone = this.selectedZone;
    if (!this.canManage || !zone) return;
    this.editingZoneId = zone.id;
    this.pendingPolygon = zone.polygon.map(point => ({ ...point }));
    this.zoneDraft = {
      name: zone.name,
      driverId: zone.driver.id,
      vehiclePlate: zone.vehicle.plate,
      vehicleModel: zone.vehicle.model
    };
    this.errorMessage = '';
    this.showZoneDialog = true;
  }

  redrawZoneBoundary(): void {
    if (!this.editingZoneId || !this.pendingPolygon) return;
    this.draftPoints = this.pendingPolygon.map(point => ({ ...point }));
    this.showZoneDialog = false;
    this.isDrawingZone = true;
    this.errorMessage = '';
    this.renderZones();
  }

  saveZone(): void {
    if (!this.pendingPolygon || !this.zoneDraft.driverId) {
      this.errorMessage = 'Dibuja los límites y selecciona un conductor.';
      return;
    }
    this.isSavingZone = true;
    this.errorMessage = '';
    const zonePayload = {
      name: this.zoneDraft.name.trim(),
      polygon: this.pendingPolygon,
      driverId: this.zoneDraft.driverId,
      vehiclePlate: this.zoneDraft.vehiclePlate.trim().toUpperCase(),
      vehicleModel: this.zoneDraft.vehicleModel.trim()
    };
    const editingZoneId = this.editingZoneId;
    const request = editingZoneId
      ? this.api.updateZone(editingZoneId, zonePayload)
      : this.api.createZone(zonePayload);

    request.subscribe({
      next: response => {
        this.isSavingZone = false;
        this.showZoneDialog = false;
        this.pendingPolygon = null;
        this.draftPoints = [];
        this.editingZoneId = null;
        this.successMessage = editingZoneId ? 'Zona actualizada correctamente.' : 'Zona guardada y asignada correctamente.';
        this.loadZones(response.data.id);
        this.loadDrivers();
      },
      error: error => {
        this.isSavingZone = false;
        this.errorMessage = error.error?.message || 'No se pudo guardar la zona.';
      }
    });
  }

  cancelZoneDraft(): void {
    this.pendingPolygon = null;
    this.showZoneDialog = false;
    this.editingZoneId = null;
    this.draftPoints = [];
    this.errorMessage = '';
    this.renderZones();
  }

  deleteSelectedZone(): void {
    const zone = this.selectedZone;
    if (!this.canManage || !zone || !window.confirm(`¿Eliminar la zona "${zone.name}" y sus pedidos?`)) return;

    this.isSavingZone = true;
    this.errorMessage = '';
    this.api.deleteZone(zone.id).subscribe({
      next: response => {
        this.isSavingZone = false;
        this.selectedZoneId = null;
        this.successMessage = response.message;
        this.loadZones();
      },
      error: error => {
        this.isSavingZone = false;
        this.errorMessage = error.error?.message || 'No se pudo eliminar la zona.';
      }
    });
  }

  beginOrderPointSelection(): void {
    if (!this.selectedZone) return;
    this.isDrawingZone = false;
    this.draftPoints = [];
    this.isPickingOrderPoint = true;
    this.errorMessage = 'Selecciona un punto dentro del polígono de la zona.';
      this.renderZones();
  }

  setOrderPoint(latitude: number, longitude: number): void {
    if (!this.selectedZone || !this.isInsideZone({ lat: latitude, lng: longitude }, this.selectedZone.polygon)) {
      this.errorMessage = 'La ubicación debe estar dentro de los límites de la zona seleccionada.';
      return;
    }
    this.orderDraft.latitude = latitude.toFixed(6);
    this.orderDraft.longitude = longitude.toFixed(6);
    this.isPickingOrderPoint = false;
    this.errorMessage = '';
  }

  addOrder(): void {
    const selectedZone = this.selectedZone;
    const latitude = Number(this.orderDraft.latitude);
    const longitude = Number(this.orderDraft.longitude);
    if (!selectedZone || selectedZone.orders.length >= 200) {
      this.errorMessage = 'La zona ya alcanzó el máximo de 200 pedidos.';
      return;
    }
    if (!this.orderDraft.description.trim() || !this.isInsideZone({ lat: latitude, lng: longitude }, selectedZone.polygon)) {
      this.errorMessage = 'Ingresa una descripción y coordenadas válidas dentro de la zona.';
      return;
    }

    this.isSavingOrder = true;
    this.errorMessage = '';
    this.api.addZoneOrder(selectedZone.id, {
      description: this.orderDraft.description.trim(),
      latitude,
      longitude
    }).subscribe({
      next: response => {
        selectedZone.orders.push(response.data);
        this.orderDraft = { description: '', latitude: '', longitude: '' };
        this.isSavingOrder = false;
        this.successMessage = `Pedido #${response.data.orderNumber} guardado en ${selectedZone.name}.`;
        this.renderZones();
      },
      error: error => {
        this.isSavingOrder = false;
        this.errorMessage = error.error?.message || 'No se pudo guardar la ubicación.';
      }
    });
  }

  updateOrderStatus(order: ZoneOrder): void {
    const nextStatus = order.status === 'delivered' ? 'pending' : 'delivered';
    this.api.updateMyZoneOrderStatus(order.id, nextStatus).subscribe({
      next: () => {
        order.status = nextStatus;
        this.renderZones();
      },
      error: error => this.errorMessage = error.error?.message || 'No se pudo actualizar el pedido.'
    });
  }

  trackZone(_index: number, zone: Zone): number {
    return zone.id;
  }

  trackOrder(_index: number, order: ZoneOrder): number {
    return order.id;
  }

  private loadZones(selectId?: number): void {
    const request = this.canManage ? this.api.getZones() : this.api.getMyZones();
    request.subscribe({
      next: response => {
        this.zones = response.data;
        this.isLoading = false;
        this.selectedZoneId = this.zones.some(zone => zone.id === selectId)
          ? selectId || null
          : this.zones.some(zone => zone.id === this.selectedZoneId)
            ? this.selectedZoneId
            : this.zones[0]?.id || null;
        this.renderZones();
      },
      error: error => {
        this.isLoading = false;
        this.errorMessage = error.error?.message || 'No se pudieron cargar las zonas. Verifica tu sesión y la conexión.';
      }
    });
  }

  private loadDrivers(): void {
    this.api.getZoneDrivers().subscribe({
      next: response => this.drivers = response.data,
      error: error => this.errorMessage = error.error?.message || 'No se pudieron cargar los conductores.'
    });
  }

  private renderZones(fitSelection = false): void {
    if (!this.map || !this.mapLoaded) return;

    const zones = this.toFeatureCollection(this.zones.map(zone => {
      const ring = zone.polygon.map(point => [point.lng, point.lat] as [number, number]);
      if (ring.length) ring.push(ring[0]);
      return {
        type: 'Feature' as const,
        properties: { zoneId: zone.id, color: zone.color, selected: zone.id === this.selectedZoneId },
        geometry: { type: 'Polygon' as const, coordinates: [ring] }
      };
    }));
    const orders = this.toFeatureCollection(this.zones.flatMap(zone => zone.orders.map(order => ({
      type: 'Feature' as const,
      properties: { orderNumber: order.orderNumber, status: order.status },
      geometry: { type: 'Point' as const, coordinates: [order.longitude, order.latitude] as [number, number] }
    }))));

    const draftRing = this.draftPoints.map(point => [point.lng, point.lat] as [number, number]);
    if (draftRing.length >= 3) draftRing.push(draftRing[0]);
    const draft = this.draftPoints.length >= 3
      ? this.toFeatureCollection([{ type: 'Feature' as const, properties: {}, geometry: { type: 'Polygon' as const, coordinates: [draftRing] } }])
      : this.toFeatureCollection(this.draftPoints.length >= 2
        ? [{ type: 'Feature' as const, properties: {}, geometry: { type: 'LineString' as const, coordinates: draftRing } }]
        : []);

    this.setGeoJSON('zones', zones);
    this.setGeoJSON('orders', orders);
    this.setGeoJSON('zone-draft', draft);
    this.renderOrderMarkers();

    if (fitSelection && this.selectedZone) {
      const bounds = new LngLatBounds();
      for (const point of this.selectedZone.polygon) bounds.extend([point.lng, point.lat]);
      if (!bounds.isEmpty()) this.map.fitBounds(bounds, { padding: 32, maxZoom: 14, duration: 450 });
    }
  }

  private setGeoJSON(id: string, data: FeatureCollection): void {
    if (!this.map) return;
    const source = this.map.getSource(id) as GeoJSONSource | undefined;
    if (source) {
      source.setData(data);
      return;
    }
    this.map.addSource(id, { type: 'geojson', data });

    if (id === 'zones') {
      this.map.addLayer({
        id: 'zone-fills',
        type: 'fill',
        source: id,
        paint: {
          'fill-color': ['get', 'color'],
          'fill-opacity': ['case', ['boolean', ['get', 'selected'], false], 0.28, 0.12]
        }
      });
      this.map.addLayer({
        id: 'zone-outlines',
        type: 'line',
        source: id,
        paint: {
          'line-color': ['get', 'color'],
          'line-width': ['case', ['boolean', ['get', 'selected'], false], 4, 2]
        }
      });
    } else if (id === 'orders') {
      this.map.addLayer({
        id: 'order-points',
        type: 'circle',
        source: id,
        paint: {
          'circle-radius': 13,
          'circle-color': ['match', ['get', 'status'], 'delivered', '#16804a', '#153da5'],
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 2
        }
      });
      this.map.addLayer({
        id: 'order-numbers',
        type: 'symbol',
        source: id,
        layout: { 'text-field': ['to-string', ['get', 'orderNumber']], 'text-size': 11 },
        paint: { 'text-color': '#ffffff' }
      });
    } else {
      this.map.addLayer({
        id: 'zone-draft-fill',
        type: 'fill',
        source: id,
        paint: { 'fill-color': '#1743B5', 'fill-opacity': 0.16 }
      });
      this.map.addLayer({
        id: 'zone-draft-line',
        type: 'line',
        source: id,
        paint: { 'line-color': '#1743B5', 'line-width': 3, 'line-dasharray': [2, 2] }
      });
    }
  }

  private renderOrderMarkers(): void {
    if (!this.map) return;
    const markers = this.map.getSource('orders') as GeoJSONSource | undefined;
    if (!markers) return;
    const orders = this.zones.flatMap(zone => zone.orders.map(order => ({
      type: 'Feature' as const,
      properties: { orderNumber: order.orderNumber, status: order.status },
      geometry: { type: 'Point' as const, coordinates: [order.longitude, order.latitude] as [number, number] }
    })));
    markers.setData(this.toFeatureCollection(orders));
  }

  private toFeatureCollection(features: Feature[]): FeatureCollection {
    return { type: 'FeatureCollection', features };
  }

  private isInsideZone(point: Coordinate, polygon: Coordinate[]): boolean {
    if (!Number.isFinite(point.lat) || !Number.isFinite(point.lng) || polygon.length < 3) return false;
    let inside = false;
    for (let current = 0, previous = polygon.length - 1; current < polygon.length; previous = current++) {
      const a = polygon[current];
      const b = polygon[previous];
      const crosses = (a.lat > point.lat) !== (b.lat > point.lat)
        && point.lng < ((b.lng - a.lng) * (point.lat - a.lat)) / (b.lat - a.lat) + a.lng;
      if (crosses) inside = !inside;
    }
    return inside;
  }

  private emptyZoneDraft(): ZoneDraft {
    return { name: '', driverId: null, vehiclePlate: '', vehicleModel: '' };
  }
}
import { Component, EventEmitter, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { BulkOrderRow, BulkPreviewData, BulkZoneSummary } from '../../models/zone.model';

@Component({
  selector: 'app-bulk-upload',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './bulk-upload.component.html',
  styleUrl: './bulk-upload.component.css'
})
export class BulkUploadComponent {
  private api = inject(ApiService);

  @Output() completed = new EventEmitter<void>();
  @Output() navigateToZones = new EventEmitter<void>();

  selectedFile: File | null = null;
  isDragging = false;
  isLoading = false;
  isImporting = false;
  isDownloadingTemplate = false;

  previewData: BulkPreviewData | null = null;
  activeFilter: 'all' | 'matched' | 'unassigned' | 'error' = 'all';

  errorMessage = '';
  successMessage = '';
  importResultSummary: { totalImported: number; byZone: any[] } | null = null;

  get filteredOrders(): BulkOrderRow[] {
    if (!this.previewData) return [];
    if (this.activeFilter === 'all') return this.previewData.orders;
    return this.previewData.orders.filter(o => o.status === this.activeFilter);
  }

  get matchedCount(): number {
    return this.previewData?.summary.matched || 0;
  }

  get unassignedCount(): number {
    return this.previewData?.summary.unassigned || 0;
  }

  get errorCount(): number {
    return this.previewData?.summary.errors || 0;
  }

  get activeZonesSummary(): BulkZoneSummary[] {
    return this.previewData?.summary.byZone.filter(z => z.newOrdersCount > 0) || [];
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleFileSelect(files[0]);
    }
  }

  onFileInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleFileSelect(input.files[0]);
    }
  }

  handleFileSelect(file: File): void {
    const validExtensions = ['.xlsx', '.xls', '.csv'];
    const hasValidExt = validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));

    if (!hasValidExt) {
      this.errorMessage = 'Formato no soportado. Selecciona un archivo Excel (.xlsx, .xls) o CSV (.csv).';
      return;
    }

    this.selectedFile = file;
    this.errorMessage = '';
    this.successMessage = '';
    this.processPreviewWithFile(file);
  }

  downloadTemplate(): void {
    this.isDownloadingTemplate = true;
    this.errorMessage = '';

    this.api.downloadBulkTemplate().subscribe({
      next: (blob) => {
        this.isDownloadingTemplate = false;
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'plantilla_carga_masiva_pedidos.xlsx';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        this.isDownloadingTemplate = false;
        this.errorMessage = err.error?.message || 'Error al descargar la plantilla.';
      }
    });
  }

  loadSampleData(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.selectedFile = null;

    // Enviar datos de muestra en Bogotá directamente a la API de vista previa
    const sampleOrders = [
      {
        description: 'XM214EN071924 · Gloria Mileny Gaitan Baquero',
        latitude: 4.651611,
        longitude: -74.087858,
        zoneHint: '',
        extraData: {
          orderNumber: 'XM214EN071924',
          trackingNumber: '2661401556754498',
          customer: 'Gloria Mileny Gaitan Baquero',
          phone: '+57 310 607 2662',
          address: 'Carrera 4 #7-45, San Bernardo',
          municipality: 'Bogota DC',
          weight: '0.001',
          statusOriginal: '131 - Descontenerizado'
        }
      },
      {
        description: 'F75815260803042MZOR · Vilma Socorro Aranguren de Gomez',
        latitude: 4.652340,
        longitude: -74.157740,
        zoneHint: '',
        extraData: {
          orderNumber: 'F75815260803042MZOR',
          trackingNumber: '2661581652745652',
          customer: 'Vilma Socorro Aranguren de Gomez',
          phone: '+57 315 790 4459',
          address: 'Carrera 71F 12B 51 Torre 7 Apto 204',
          municipality: 'Kennedy',
          weight: '0.023',
          statusOriginal: '131 - Descontenerizado'
        }
      },
      {
        description: '295616619 · Leydi Cortes',
        latitude: 4.634880,
        longitude: -74.173720,
        zoneHint: '',
        extraData: {
          orderNumber: '295616619',
          trackingNumber: '2602228759645511',
          customer: 'Leydi Cortes',
          phone: '3046410796',
          address: 'Cra 88G #42G-54 Sur Casa Las Vegas 1',
          municipality: 'Kennedy',
          weight: '1.0',
          statusOriginal: '131 - Descontenerizado'
        }
      },
      {
        description: 'F782392608060030LkN · Jenifer Sancho',
        latitude: 4.630090,
        longitude: -74.169880,
        zoneHint: '',
        extraData: {
          orderNumber: 'F782392608060030LkN',
          trackingNumber: '2615145084754424',
          customer: 'Jenifer Sancho',
          phone: '+57 322 789 1687',
          address: 'Calle 42 F Bis Sur #86-70',
          municipality: 'Kennedy',
          weight: '0.06',
          statusOriginal: '131 - Descontenerizado'
        }
      },
      {
        description: 'XM999DEST01 · Destino Fuera de Cobertura',
        latitude: 4.178630,
        longitude: -74.423190,
        zoneHint: '',
        extraData: {
          orderNumber: 'XM999DEST01',
          trackingNumber: '2699999999999999',
          customer: 'Cliente San Bernardo',
          phone: '+57 310 000 0000',
          address: 'Vereda San Bernardo Km 12',
          municipality: 'San Bernardo',
          weight: '0.2',
          statusOriginal: 'Pendiente'
        }
      }
    ];

    this.api.previewBulkOrders({ orders: sampleOrders }).subscribe({
      next: (res) => {
        this.isLoading = false;
        if (res.success) {
          this.previewData = res.data;
          this.activeFilter = 'all';
        }
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.error?.message || 'Error al procesar los datos de prueba.';
      }
    });
  }

  processPreviewWithFile(file: File): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.previewData = null;

    const formData = new FormData();
    formData.append('file', file);

    this.api.previewBulkOrders(formData).subscribe({
      next: (res) => {
        this.isLoading = false;
        if (res.success) {
          this.previewData = res.data;
          this.activeFilter = 'all';
        }
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.error?.message || 'No fue posible leer el archivo. Revisa su formato y columnas.';
      }
    });
  }

  confirmImport(): void {
    if (!this.previewData || this.matchedCount === 0) return;

    this.isImporting = true;
    this.errorMessage = '';

    // Si tenemos el archivo original, enviamos el FormData o enviamos las órdenes validadas
    if (this.selectedFile) {
      const formData = new FormData();
      formData.append('file', this.selectedFile);

      this.api.importBulkOrders(formData).subscribe({
        next: (res) => this.handleImportSuccess(res),
        error: (err) => this.handleImportError(err)
      });
    } else {
      // Enviar las órdenes validadas directamente
      this.api.importBulkOrders({ orders: this.previewData.orders }).subscribe({
        next: (res) => this.handleImportSuccess(res),
        error: (err) => this.handleImportError(err)
      });
    }
  }

  private handleImportSuccess(res: any): void {
    this.isImporting = false;
    this.successMessage = res.message || 'Carga masiva completada con éxito.';
    this.importResultSummary = {
      totalImported: res.data?.totalImported || this.matchedCount,
      byZone: res.data?.byZone || []
    };
    this.previewData = null;
    this.selectedFile = null;
    this.completed.emit();
  }

  private handleImportError(err: any): void {
    this.isImporting = false;
    this.errorMessage = err.error?.message || 'Error durante la importación de pedidos.';
  }

  resetUpload(): void {
    this.selectedFile = null;
    this.previewData = null;
    this.errorMessage = '';
    this.successMessage = '';
    this.importResultSummary = null;
  }

  goToZones(): void {
    this.navigateToZones.emit();
  }
}


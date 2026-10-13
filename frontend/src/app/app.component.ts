import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LoginComponent } from './components/login/login.component';
import { ZoneManagementComponent } from './components/zone-management/zone-management.component';
import { BulkUploadComponent } from './components/bulk-upload/bulk-upload.component';
import { AuthService } from './services/auth.service';
import { ApiService } from './services/api.service';
import { User } from './models/auth.model';
import { Item, HealthStatus } from './models/item.model';
import { PistoleoComponent } from './components/pistoleo/pistoleo.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, LoginComponent, ZoneManagementComponent, BulkUploadComponent, PistoleoComponent],
  templateUrl: './app.component.html',
})
export class AppComponent implements OnInit {
  authService = inject(AuthService);
  private apiService = inject(ApiService);

  get isCoordinator(): boolean {
    const role = this.authService.currentUser()?.role?.toLowerCase();
    return role === 'coordinador' || role === 'admin';
  }

  get completedItemsCount(): number {
    return this.items.filter(item => item.completed).length;
  }

  get pendingItemsCount(): number {
    return this.items.length - this.completedItemsCount;
  }

  get routeEfficiency(): number {
    return this.items.length ? Math.round((this.completedItemsCount / this.items.length) * 1000) / 10 : 0;
  }

  // Estados de navegación
  activeNav: string = 'Dashboard';
  showNotifications = false;
  showProfileDropdown = false;

  // Datos backend
  healthStatus: HealthStatus | null = null;
  items: Item[] = [];
  newItemTitle = '';
  newItemCategory = 'Logística';
  isLoadingItems = false;

  // Notificaciones demo
  notifications = [
    { id: 1, title: 'Nueva ruta asignada', time: 'Hace 5m', read: false },
    { id: 2, title: 'Alerta de zona: Tráfico en Autopista Norte', time: 'Hace 25m', read: false },
    { id: 3, title: 'Entrega #4092 completada', time: 'Hace 1h', read: true }
  ];

  ngOnInit(): void {
    // Si ya hay usuario autenticado, cargar datos
    if (this.authService.isLoggedIn()) {
      this.loadDashboardData();
    }
  }

  onUserLoggedIn(user: User): void {
    this.loadDashboardData();
  }

  loadDashboardData(): void {
    this.isLoadingItems = true;

    this.apiService.getHealth().subscribe({
      next: (status) => this.healthStatus = status,
      error: (err) => console.error('Error al consultar health:', err)
    });

    this.apiService.getItems().subscribe({
      next: (res) => {
        if (res.success) {
          this.items = res.data;
        }
        this.isLoadingItems = false;
      },
      error: (err) => {
        console.error('Error al cargar items:', err);
        this.isLoadingItems = false;
      }
    });
  }

  setActiveNav(navItem: string): void {
    this.activeNav = navItem;
    if (navItem === 'Perfil') {
      this.showProfileDropdown = true;
    }
  }

  toggleNotifications(): void {
    this.showNotifications = !this.showNotifications;
    this.showProfileDropdown = false;
  }

  toggleProfileDropdown(): void {
    this.showProfileDropdown = !this.showProfileDropdown;
    this.showNotifications = false;
  }

  logout(): void {
    this.authService.logout().subscribe({
      next: () => {
        this.showProfileDropdown = false;
        this.showNotifications = false;
      }
    });
  }

  // Operaciones de gestión de pedidos
  addItem(): void {
    const title = this.newItemTitle.trim();
    if (!title) return;

    this.apiService.createItem({ title, category: this.newItemCategory }).subscribe({
      next: (res) => {
        if (res.success) {
          this.items.push(res.data);
          this.newItemTitle = '';
        }
      }
    });
  }

  toggleItem(item: Item): void {
    this.apiService.toggleItem(item.id).subscribe({
      next: (res) => {
        if (res.success) {
          item.completed = res.data.completed;
        }
      }
    });
  }

  deleteItem(id: number): void {
    this.apiService.deleteItem(id).subscribe({
      next: (res) => {
        if (res.success) {
          this.items = this.items.filter(i => i.id !== id);
        }
      }
    });
  }
}


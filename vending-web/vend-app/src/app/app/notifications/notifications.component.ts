import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { NotificationsService } from '../../core/services/notifications.service';

type NotificationKind = 'warning' | 'info' | 'success';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notifications.component.html',
  styleUrl: './notifications.component.css'
})
export class NotificationsComponent {
  private readonly notificationsService = inject(NotificationsService);

  readonly pageSize = 25;
  readonly currentPage = signal(1);
  readonly rows = this.notificationsService.rows;
  readonly unreadCount = this.notificationsService.unreadCount;

  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.rows().length / this.pageSize))
  );

  readonly pagedRows = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.rows().slice(start, start + this.pageSize);
  });

  nextPage(): void {
    this.currentPage.update((page) => Math.min(page + 1, this.totalPages()));
  }

  prevPage(): void {
    this.currentPage.update((page) => Math.max(page - 1, 1));
  }

  markRead(id: number): void {
    this.notificationsService.markRead(id);
  }

  markAllRead(): void {
    this.notificationsService.markAllRead();
  }

  statusIcon(kind: NotificationKind): string {
    if (kind === 'warning') return '⚠️';
    if (kind === 'info') return 'ℹ️';
    return '✅';
  }
}

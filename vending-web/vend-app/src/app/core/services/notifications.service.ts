import { Injectable, computed, signal } from '@angular/core';

export type NotificationKind = 'warning' | 'info' | 'success';

export type NotificationItem = {
  id: number;
  status: NotificationKind;
  dateTime: string;
  code: string;
  description: string;
  isRead: boolean;
};

@Injectable({
  providedIn: 'root'
})
export class NotificationsService {
  readonly rows = signal<NotificationItem[]>(
    Array.from({ length: 58 }).map((_, idx) => {
      const id = idx + 1;
      const status: NotificationKind = id % 5 === 0 ? 'warning' : id % 3 === 0 ? 'info' : 'success';
      return {
        id,
        status,
        dateTime: `20.02.2026 1${Math.floor((idx % 10) / 2)}:${String((idx * 3) % 60).padStart(2, '0')}:01`,
        code: `NTF-${String(id).padStart(4, '0')}`,
        description:
          status === 'warning'
            ? 'Требуется проверка автомата'
            : status === 'info'
              ? 'Получено информационное сообщение'
              : 'Операция выполнена успешно',
        isRead: id % 4 === 0
      };
    })
  );

  readonly unreadCount = computed(() =>
    this.rows().reduce((sum, row) => sum + (row.isRead ? 0 : 1), 0)
  );

  markRead(id: number): void {
    this.rows.update((rows) =>
      rows.map((row) =>
        row.id === id ? { ...row, isRead: true } : row
      )
    );
  }

  markAllRead(): void {
    this.rows.update((rows) =>
      rows.map((row) => ({ ...row, isRead: true }))
    );
  }
}

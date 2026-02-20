import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';

type TicketStatus = 'Новый' | 'Ждет ответа' | 'Ответ получен' | 'Закрыт';

type TicketRow = {
  id: string;
  dateTime: string;
  topic: string;
  description: string;
  user: string;
  status: TicketStatus;
};

type TicketDraft = {
  topic: string;
  description: string;
  user: string;
  status: TicketStatus;
};

@Component({
  selector: 'app-tickets',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tickets.component.html',
  styleUrl: './tickets.component.css'
})
export class TicketsComponent {
  readonly statuses: TicketStatus[] = ['Новый', 'Ждет ответа', 'Ответ получен', 'Закрыт'];
  readonly modalOpen = signal(false);
  readonly editMode = signal(false);
  readonly editingTicketId = signal<string | null>(null);

  readonly draft = signal<TicketDraft>({
    topic: '',
    description: '',
    user: '',
    status: 'Новый'
  });

  readonly rows = signal<TicketRow[]>([
    {
      id: 'TCK-001',
      dateTime: '20.02.2026 09:15:01',
      topic: 'Нет связи с автоматом',
      description: 'Автомат VM-012 не выходит на связь более 2 часов',
      user: 'operator@etalon-dv.com',
      status: 'Новый'
    },
    {
      id: 'TCK-002',
      dateTime: '20.02.2026 10:42:15',
      topic: 'Ошибка оплаты картой',
      description: 'Покупатель сообщил о повторном списании',
      user: 'support@etalon-dv.com',
      status: 'Ждет ответа'
    },
    {
      id: 'TCK-003',
      dateTime: '20.02.2026 11:06:38',
      topic: 'Запрос на обновление ПО',
      description: 'Нужно обновить контроллер до версии v2.21.0',
      user: 'engineer@etalon-dv.com',
      status: 'Ответ получен'
    }
  ]);

  openCreateModal(): void {
    this.editMode.set(false);
    this.editingTicketId.set(null);
    this.draft.set({
      topic: '',
      description: '',
      user: '',
      status: 'Новый'
    });
    this.modalOpen.set(true);
  }

  openEditModal(ticketId: string): void {
    const ticket = this.rows().find((item) => item.id === ticketId);
    if (!ticket) return;

    this.editMode.set(true);
    this.editingTicketId.set(ticketId);
    this.draft.set({
      topic: ticket.topic,
      description: ticket.description,
      user: ticket.user,
      status: ticket.status
    });
    this.modalOpen.set(true);
  }

  closeModal(): void {
    this.modalOpen.set(false);
  }

  updateDraft<K extends keyof TicketDraft>(key: K, value: TicketDraft[K]): void {
    this.draft.update((current) => ({ ...current, [key]: value }));
  }

  saveTicket(): void {
    const draft = this.draft();

    if (this.editMode() && this.editingTicketId()) {
      const targetId = this.editingTicketId()!;
      this.rows.update((rows) =>
        rows.map((row) =>
          row.id === targetId
            ? {
                ...row,
                topic: draft.topic.trim() || row.topic,
                description: draft.description.trim() || row.description,
                user: draft.user.trim() || row.user,
                status: draft.status
              }
            : row
        )
      );
      this.modalOpen.set(false);
      return;
    }

    const nextId = this.nextTicketId();
    const newTicket: TicketRow = {
      id: nextId,
      dateTime: this.nowDateTime(),
      topic: draft.topic.trim() || 'Новый тикет',
      description: draft.description.trim() || '-',
      user: draft.user.trim() || 'operator@etalon-dv.com',
      status: draft.status
    };

    this.rows.update((rows) => [newTicket, ...rows]);
    this.modalOpen.set(false);
  }

  private nextTicketId(): string {
    const numbers = this.rows()
      .map((row) => Number.parseInt(row.id.replace('TCK-', ''), 10))
      .filter((n) => Number.isFinite(n));
    const next = (numbers.length ? Math.max(...numbers) : 0) + 1;
    return `TCK-${String(next).padStart(3, '0')}`;
  }

  private nowDateTime(): string {
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yyyy = now.getFullYear();
    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    const sec = String(now.getSeconds()).padStart(2, '0');
    return `${dd}.${mm}.${yyyy} ${hh}:${min}:${sec}`;
  }
}

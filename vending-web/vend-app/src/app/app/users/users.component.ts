import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';

type UserRole = 'Администратор' | 'Диспетчер' | 'Бухгалтер' | 'Директор' | 'Пользователь';

type UserRow = {
  id: string;
  fullName: string;
  birthDate: string;
  phone: string;
  email: string;
  active: boolean;
  role: UserRole;
  company: string;
  selected: boolean;
};

type UserDraft = {
  fullName: string;
  birthDate: string;
  phone: string;
  email: string;
  active: boolean;
  role: UserRole;
  company: string;
};

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './users.component.html',
  styleUrl: './users.component.css'
})
export class UsersComponent {
  readonly createModalOpen = signal(false);
  readonly isEditMode = signal(false);
  readonly editingUserId = signal<string | null>(null);
  readonly roles: UserRole[] = ['Администратор', 'Диспетчер', 'Бухгалтер', 'Директор', 'Пользователь'];

  readonly draft = signal<UserDraft>({
    fullName: '',
    birthDate: '',
    phone: '',
    email: '',
    active: true,
    role: 'Пользователь',
    company: 'ООО "Эталон ДВ"'
  });

  readonly users = signal<UserRow[]>([
    {
      id: 'USR-001',
      fullName: 'Иванов Иван Иванович',
      birthDate: '15.03.1988',
      phone: '+79261234567',
      email: 'op@mail.ru',
      active: true,
      role: 'Администратор',
      company: 'ООО "Эталон ДВ"',
      selected: false
    },
    {
      id: 'USR-002',
      fullName: 'Петрова Марина Сергеевна',
      birthDate: '21.07.1991',
      phone: '+79025590071',
      email: 'dispatcher@etalon-dv.com',
      active: true,
      role: 'Диспетчер',
      company: 'ООО "Эталон ДВ"',
      selected: false
    },
    {
      id: 'USR-003',
      fullName: 'Сидоров Алексей Викторович',
      birthDate: '02.12.1985',
      phone: '+79141239876',
      email: 'finance@etalon-dv.com',
      active: false,
      role: 'Бухгалтер',
      company: 'ООО "Эталон ДВ"',
      selected: false
    }
  ]);

  toggleSelect(userId: string, checked: boolean): void {
    this.users.update((rows) =>
      rows.map((row) =>
        row.id === userId ? { ...row, selected: checked } : row
      )
    );
  }

  createUser(): void {
    this.resetDraft();
    this.isEditMode.set(false);
    this.editingUserId.set(null);
    this.createModalOpen.set(true);
  }

  closeCreateModal(): void {
    this.createModalOpen.set(false);
  }

  updateDraft<K extends keyof UserDraft>(key: K, value: UserDraft[K]): void {
    this.draft.update((current) => ({ ...current, [key]: value }));
  }

  saveNewUser(): void {
    const draft = this.draft();
    if (this.isEditMode() && this.editingUserId()) {
      const id = this.editingUserId()!;
      this.users.update((rows) =>
        rows.map((row) =>
          row.id === id
            ? {
                ...row,
                fullName: draft.fullName.trim() || row.fullName,
                birthDate: this.formatBirthDate(draft.birthDate),
                phone: draft.phone.trim() || row.phone,
                email: draft.email.trim() || row.email,
                active: draft.active,
                role: draft.role,
                company: draft.company.trim() || row.company
              }
            : row
        )
      );
      this.createModalOpen.set(false);
      return;
    }

    const nextId = this.buildNextUserId();

    const newUser: UserRow = {
      id: nextId,
      fullName: draft.fullName.trim() || 'Новый пользователь',
      birthDate: this.formatBirthDate(draft.birthDate),
      phone: draft.phone.trim() || '+70000000000',
      email: draft.email.trim() || 'user@mail.ru',
      active: draft.active,
      role: draft.role,
      company: draft.company.trim() || 'ООО "Эталон ДВ"',
      selected: false
    };

    this.users.update((rows) => [newUser, ...rows]);
    this.createModalOpen.set(false);
  }

  deleteSelectedUsers(): void {
    this.users.update((rows) => rows.filter((row) => !row.selected));
  }

  openEditUser(userId: string): void {
    const user = this.users().find((row) => row.id === userId);
    if (!user) return;

    this.draft.set({
      fullName: user.fullName,
      birthDate: this.birthDateToInput(user.birthDate),
      phone: user.phone,
      email: user.email,
      active: user.active,
      role: user.role,
      company: user.company
    });

    this.isEditMode.set(true);
    this.editingUserId.set(user.id);
    this.createModalOpen.set(true);
  }

  private resetDraft(): void {
    this.draft.set({
      fullName: '',
      birthDate: '',
      phone: '',
      email: '',
      active: true,
      role: 'Пользователь',
      company: 'ООО "Эталон ДВ"'
    });
  }

  private buildNextUserId(): string {
    const numbers = this.users()
      .map((row) => Number.parseInt(row.id.replace('USR-', ''), 10))
      .filter((n) => Number.isFinite(n));
    const next = (numbers.length ? Math.max(...numbers) : 0) + 1;
    return `USR-${String(next).padStart(3, '0')}`;
  }

  private formatBirthDate(value: string): string {
    if (!value) return '';
    const [yyyy, mm, dd] = value.split('-');
    if (!yyyy || !mm || !dd) return value;
    return `${dd}.${mm}.${yyyy}`;
  }

  private birthDateToInput(value: string): string {
    if (!value) return '';
    const [dd, mm, yyyy] = value.split('.');
    if (!dd || !mm || !yyyy) return '';
    return `${yyyy}-${mm}-${dd}`;
  }
}

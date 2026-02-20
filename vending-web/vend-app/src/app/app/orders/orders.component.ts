import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

type LicenseStatus = 'active' | 'expiring' | 'inactive';

type LicenseRow = {
  id: number;
  machineId: string;
  type: 'Лицензия автомата' | 'Лицензия системы';
  term: string;
  status: LicenseStatus;
  daysLeft: number;
};

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './orders.component.html',
  styleUrl: './orders.component.css'
})
export class OrdersComponent {
  readonly licenses: LicenseRow[] = [
    {
      id: 101,
      machineId: '001',
      type: 'Лицензия автомата',
      term: '1 год (01.01.2026 по 31.12.2026)',
      status: 'active',
      daysLeft: 315
    },
    {
      id: 102,
      machineId: '002',
      type: 'Лицензия автомата',
      term: '1 год (01.01.2026 по 31.12.2026)',
      status: 'expiring',
      daysLeft: 28
    },
    {
      id: 103,
      machineId: 'SYS-001',
      type: 'Лицензия системы',
      term: '1 год (01.01.2025 по 31.12.2025)',
      status: 'inactive',
      daysLeft: 0
    }
  ];

  statusLabel(status: LicenseStatus): string {
    if (status === 'active') {
      return 'Действует';
    }
    if (status === 'expiring') {
      return 'Истекает';
    }
    return 'Не действует';
  }

  statusClass(status: LicenseStatus): string {
    if (status === 'active') {
      return 'status-active';
    }
    if (status === 'expiring') {
      return 'status-expiring';
    }
    return 'status-inactive';
  }
}

import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';

type MachineLicense = {
  id: string;
  term: string;
  active: boolean;
};

type CompanyMachineRow = {
  statusOnline: boolean;
  id: string;
  name: string;
  address: string;
  company: string;
  version: string;
  machineLicense: MachineLicense;
  softwareLicense: MachineLicense;
};

type CompanyForm = {
  id: string;
  inn: string;
  name: string;
  address: string;
  phoneRaw: string;
  telegram: string;
  email: string;
  notificationsEnabled: boolean;
};

@Component({
  selector: 'app-company',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './company.component.html',
  styleUrl: './company.component.css'
})
export class CompanyComponent {
  readonly pageSize = 25;
  readonly currentPage = signal(1);
  readonly saveMessage = signal('');
  readonly connectModalOpen = signal(false);
  readonly configurationCode = signal('');
  readonly connectToast = signal('');

  readonly form = signal<CompanyForm>({
    id: 'COMP-001',
    inn: '2511070844',
    name: 'ООО "Эталон ДВ"',
    address: '692519, Приморский край, г Уссурийск, ул Пушкина, д 32, кв 35',
    phoneRaw: '+79025590071',
    telegram: '@Kuzmenko_Dimas',
    email: 'm777@etalon-dv.com',
    notificationsEnabled: true
  });

  readonly machines: CompanyMachineRow[] = this.buildMachineRows();

  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.machines.length / this.pageSize))
  );

  readonly pagedMachines = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.machines.slice(start, start + this.pageSize);
  });

  readonly phoneDisplay = computed(() => this.formatPhone(this.form().phoneRaw));

  updateField<K extends keyof CompanyForm>(key: K, value: CompanyForm[K]): void {
    this.form.update((current) => ({ ...current, [key]: value }));
  }

  onPhoneInput(value: string): void {
    this.updateField('phoneRaw', this.normalizePhone(value));
  }

  saveCompany(): void {
    this.saveMessage.set(`Сохранено. Телефон в системе: ${this.form().phoneRaw}`);
  }

  openConnectModal(): void {
    this.configurationCode.set('');
    this.connectModalOpen.set(true);
  }

  closeConnectModal(): void {
    this.connectModalOpen.set(false);
  }

  setConfigurationCode(value: string): void {
    this.configurationCode.set(value);
  }

  connectMachine(): void {
    this.connectModalOpen.set(false);
    this.showToast('Запрос на подключение автомата отправлен');
  }

  orderMachineLicense(): void {
    this.showToast('Запрос на лицензию автомата отправлен');
  }

  orderSoftwareLicense(): void {
    this.showToast('Запрос на лицензию ПО отправлен');
  }

  nextPage(): void {
    this.currentPage.update((page) => Math.min(page + 1, this.totalPages()));
  }

  prevPage(): void {
    this.currentPage.update((page) => Math.max(page - 1, 1));
  }

  statusClass(active: boolean): string {
    return active ? 'ok' : 'bad';
  }

  private normalizePhone(value: string): string {
    const digits = value.replace(/\D/g, '');
    if (!digits) {
      return '+7';
    }

    let normalized = digits;
    if (normalized.startsWith('8')) {
      normalized = `7${normalized.slice(1)}`;
    }
    if (!normalized.startsWith('7')) {
      normalized = `7${normalized}`;
    }

    return `+${normalized.slice(0, 11)}`;
  }

  private formatPhone(raw: string): string {
    const digits = raw.replace(/\D/g, '');
    const country = digits.slice(0, 1) || '7';
    const p1 = digits.slice(1, 4);
    const p2 = digits.slice(4, 7);
    const p3 = digits.slice(7, 9);
    const p4 = digits.slice(9, 11);

    const parts = [
      `+${country}`,
      p1 ? `(${p1}` : '',
      p1?.length === 3 ? ')' : '',
      p2 ? ` ${p2}` : '',
      p3 ? `-${p3}` : '',
      p4 ? `-${p4}` : ''
    ];

    return parts.join('');
  }

  private buildMachineRows(): CompanyMachineRow[] {
    const rows: CompanyMachineRow[] = [];

    for (let i = 1; i <= 33; i += 1) {
      const id = `VM-${String(i).padStart(3, '0')}`;
      const activeMachineLicense = i % 5 !== 0;
      const activeSoftwareLicense = i % 4 !== 0;

      rows.push({
        statusOnline: i % 6 !== 0,
        id,
        name: `Автомат ${String(i).padStart(3, '0')}`,
        address: i % 2 === 0
          ? 'Санкт-Петербург, Невский пр., 10'
          : 'Уссурийск, ул. Некрасова, 44',
        company: 'ООО "Эталон ДВ"',
        version: `v2.${10 + (i % 7)}.${i % 10}`,
        machineLicense: {
          id: `ML-${1000 + i}`,
          term: activeMachineLicense ? '01.01.2026 - 31.12.2026' : '01.01.2025 - 31.12.2025',
          active: activeMachineLicense
        },
        softwareLicense: {
          id: `SL-${3000 + i}`,
          term: activeSoftwareLicense ? '01.01.2026 - 31.12.2026' : '01.01.2025 - 31.12.2025',
          active: activeSoftwareLicense
        }
      });
    }

    return rows;
  }

  private showToast(message: string): void {
    this.connectToast.set(message);
    setTimeout(() => this.connectToast.set(''), 3000);
  }
}

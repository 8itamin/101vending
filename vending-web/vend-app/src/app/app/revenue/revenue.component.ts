import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { ExportService } from '../../core/services/export.service';

type PaymentKind = 'Наличная' | 'Безналичная';
type PeriodPreset = '1m' | '2m' | '3m' | '6m' | '1y' | 'full' | 'custom';

type RevenueRow = {
  id: number;
  dateTime: string;
  machineAddress: string;
  payment: PaymentKind;
  cardNumber: string;
  amount: number;
  water: number;
  bottles: number;
  acceptedChange: string;
  timestamp: Date;
};

@Component({
  selector: 'app-revenue',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './revenue.component.html',
  styleUrl: './revenue.component.css'
})
export class RevenueComponent {
  readonly pageSize = 25;
  readonly currentPage = signal(1);
  readonly periodPreset = signal<PeriodPreset>('1m');
  readonly fromDate = signal('');
  readonly toDate = signal('');

  readonly rows: RevenueRow[] = this.buildRows();

  readonly filteredRows = computed(() => {
    const from = this.fromDate() ? this.parseDate(this.fromDate(), '00:00:00') : null;
    const to = this.toDate() ? this.parseDate(this.toDate(), '23:59:59') : null;

    return this.rows.filter((row) => {
      if (from && row.timestamp < from) {
        return false;
      }
      if (to && row.timestamp > to) {
        return false;
      }
      return true;
    });
  });

  readonly totals = computed(() => {
    const rows = this.filteredRows();

    return rows.reduce(
      (acc, row) => {
        acc.amount += row.amount;
        acc.water += row.water;
        acc.bottles += row.bottles;
        return acc;
      },
      { amount: 0, water: 0, bottles: 0, count: rows.length }
    );
  });

  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredRows().length / this.pageSize))
  );

  readonly pagedRows = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.filteredRows().slice(start, start + this.pageSize);
  });

  constructor(private exportService: ExportService) {
    const { from, to } = this.currentMonthRange();
    this.fromDate.set(from);
    this.toDate.set(to);
  }

  exportSelectedToExcel(): void {
    const exportRows = this.filteredRows().map((row) => ({
      id: row.id,
      'Дата и время': row.dateTime,
      'Автомат (Адрес автомата)': row.machineAddress,
      Оплата: row.payment,
      'Номер карты': row.cardNumber,
      Выручка: `${row.amount} ₽`,
      Вода: `${row.water} л`,
      Тара: `${row.bottles} шт`,
      'Принято/Сдача': row.acceptedChange
    }));

    const summaryRow = {
      id: 'ИТОГО',
      'Дата и время': `Записей: ${this.totals().count}`,
      'Автомат (Адрес автомата)': '-',
      Оплата: '-',
      'Номер карты': '-',
      Выручка: `${this.totals().amount} ₽`,
      Вода: `${this.totals().water} л`,
      Тара: `${this.totals().bottles} шт`,
      'Принято/Сдача': '-'
    };

    const stamp = this.buildFileStamp();
    this.exportService.exportToExcel(
      [summaryRow, ...exportRows],
      `vyrychka_${stamp}.xlsx`,
      'Выручка'
    );
  }

  onPresetChange(value: string): void {
    const preset = value as PeriodPreset;
    this.periodPreset.set(preset);
    this.currentPage.set(1);

    if (preset === 'custom') {
      return;
    }

    if (preset === 'full') {
      const oldest = this.rows[this.rows.length - 1]?.timestamp;
      const newest = this.rows[0]?.timestamp;
      this.fromDate.set(oldest ? this.toDateInput(oldest) : '');
      this.toDate.set(newest ? this.toDateInput(newest) : '');
      return;
    }

    const months = Number.parseInt(preset.replace('m', ''), 10);
    if (preset === '1y') {
      this.applyRelativePeriod(12);
      return;
    }
    this.applyRelativePeriod(months);
  }

  onFromDateChange(value: string): void {
    this.fromDate.set(value);
    this.periodPreset.set('custom');
    this.currentPage.set(1);
  }

  onToDateChange(value: string): void {
    this.toDate.set(value);
    this.periodPreset.set('custom');
    this.currentPage.set(1);
  }

  nextPage(): void {
    this.currentPage.update((page) => Math.min(page + 1, this.totalPages()));
  }

  prevPage(): void {
    this.currentPage.update((page) => Math.max(page - 1, 1));
  }

  private applyRelativePeriod(monthsBack: number): void {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - (monthsBack - 1), 1);
    this.fromDate.set(this.toDateInput(start));
    this.toDate.set(this.toDateInput(now));
  }

  private currentMonthRange(): { from: string; to: string } {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: this.toDateInput(from), to: this.toDateInput(now) };
  }

  private toDateInput(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private parseDate(dateInput: string, time: string): Date {
    return new Date(`${dateInput}T${time}`);
  }

  private buildRows(): RevenueRow[] {
    const base = new Date('2026-02-20T10:15:00');
    const rows: RevenueRow[] = [];

    for (let i = 0; i < 80; i += 1) {
      const point = new Date(base);
      point.setHours(point.getHours() - i * 9);

      const payment: PaymentKind = i % 3 === 0 ? 'Безналичная' : 'Наличная';
      const amount = 350 + (i % 9) * 75;
      const water = 60 + (i % 6) * 20;
      const bottles = 2 + (i % 5);
      const accepted = `${amount + 100} ₽ / ${100} ₽`;

      rows.push({
        id: i + 1,
        dateTime: this.formatDateTime(point),
        machineAddress: this.machineAddressByIndex(i),
        payment,
        cardNumber: payment === 'Безналичная' ? `**** **** **** ${String(1000 + i).slice(-4)}` : '-',
        amount,
        water,
        bottles,
        acceptedChange: accepted,
        timestamp: point
      });
    }

    return rows;
  }

  private formatDateTime(value: Date): string {
    const dd = String(value.getDate()).padStart(2, '0');
    const mm = String(value.getMonth() + 1).padStart(2, '0');
    const yyyy = value.getFullYear();
    const hh = String(value.getHours()).padStart(2, '0');
    const min = String(value.getMinutes()).padStart(2, '0');
    const sec = String(value.getSeconds()).padStart(2, '0');
    return `${dd}.${mm}.${yyyy} ${hh}:${min}:${sec}`;
  }

  private machineAddressByIndex(index: number): string {
    const addresses = [
      '001 / Санкт-Петербург, Невский пр., 10',
      '002 / Санкт-Петербург, Литейный пр., 34',
      '003 / Санкт-Петербург, ул. Есенина, 12',
      '004 / Москва, Щелковское ш., 75'
    ];
    return addresses[index % addresses.length];
  }

  private buildFileStamp(): string {
    const from = this.fromDate() || 'start';
    const to = this.toDate() || 'end';
    return `${from}_${to}`.replaceAll('-', '');
  }
}

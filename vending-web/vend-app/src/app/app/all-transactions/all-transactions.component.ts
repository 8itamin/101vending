import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { ExportService } from '../../core/services/export.service';

type Direction = 'Приход' | 'Уход';
type Operation = 'Покупка' | 'Инкассация' | 'Корректировка';
type Side = 'Покупатель' | 'Пользователь';
type PeriodPreset = '1m' | '2m' | '3m' | '6m' | '1y' | 'full' | 'custom';

type TransactionRow = {
  id: number;
  direction: Direction;
  dateTime: string;
  machineAddress: string;
  amount: number;
  operation: Operation;
  side: Side;
  description: string;
  timestamp: Date;
};

@Component({
  selector: 'app-all-transactions',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './all-transactions.component.html',
  styleUrl: './all-transactions.component.css'
})
export class AllTransactionsComponent {
  readonly pageSize = 25;
  readonly currentPage = signal(1);
  readonly periodPreset = signal<PeriodPreset>('1m');
  readonly fromDate = signal('');
  readonly toDate = signal('');

  readonly rows: TransactionRow[] = this.buildRows();

  readonly filteredRows = computed(() => {
    const from = this.fromDate() ? this.parseDate(this.fromDate(), '00:00:00') : null;
    const to = this.toDate() ? this.parseDate(this.toDate(), '23:59:59') : null;

    return this.rows.filter((row) => {
      if (from && row.timestamp < from) return false;
      if (to && row.timestamp > to) return false;
      return true;
    });
  });

  readonly totals = computed(() => {
    const rows = this.filteredRows();
    return rows.reduce(
      (acc, row) => {
        if (row.amount >= 0) {
          acc.income += row.amount;
        } else {
          acc.expense += Math.abs(row.amount);
        }
        acc.net += row.amount;
        return acc;
      },
      { income: 0, expense: 0, net: 0, count: rows.length }
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

  onPresetChange(value: string): void {
    const preset = value as PeriodPreset;
    this.periodPreset.set(preset);
    this.currentPage.set(1);

    if (preset === 'custom') return;

    if (preset === 'full') {
      const oldest = this.rows[this.rows.length - 1]?.timestamp;
      const newest = this.rows[0]?.timestamp;
      this.fromDate.set(oldest ? this.toDateInput(oldest) : '');
      this.toDate.set(newest ? this.toDateInput(newest) : '');
      return;
    }

    if (preset === '1y') {
      this.applyRelativePeriod(12);
      return;
    }

    const months = Number.parseInt(preset.replace('m', ''), 10);
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

  exportSelectedToExcel(): void {
    const exportRows = this.filteredRows().map((row) => ({
      id: row.id,
      Направление: row.direction,
      'Дата и время': row.dateTime,
      'Автомат (Адрес автомата)': row.machineAddress,
      Сумма: `${row.amount} ₽`,
      Операция: row.operation,
      Сторона: row.side,
      Описание: row.description || '-'
    }));

    const totals = this.totals();
    const summaryRow = {
      id: 'ИТОГО',
      Направление: '-',
      'Дата и время': `Записей: ${totals.count}`,
      'Автомат (Адрес автомата)': '-',
      Сумма: `${totals.net} ₽ (Приход: ${totals.income} ₽, Уход: ${totals.expense} ₽)`,
      Операция: '-',
      Сторона: '-',
      Описание: '-'
    };

    const stamp = this.buildFileStamp();
    this.exportService.exportToExcel(
      [summaryRow, ...exportRows],
      `transactions_${stamp}.xlsx`,
      'Транзакции'
    );
  }

  nextPage(): void {
    this.currentPage.update((page) => Math.min(page + 1, this.totalPages()));
  }

  prevPage(): void {
    this.currentPage.update((page) => Math.max(page - 1, 1));
  }

  directionIcon(direction: Direction): string {
    return direction === 'Приход' ? '🟢' : '🔴';
  }

  directionClass(direction: Direction): string {
    return direction === 'Приход' ? 'income' : 'expense';
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

  private buildRows(): TransactionRow[] {
    const base = new Date('2026-02-20T10:35:00');
    const rows: TransactionRow[] = [];
    const operations: Operation[] = ['Покупка', 'Инкассация', 'Корректировка'];

    for (let i = 0; i < 90; i += 1) {
      const point = new Date(base);
      point.setHours(point.getHours() - i * 8);

      const isIncome = i % 4 !== 0;
      const amount = (isIncome ? 1 : -1) * (300 + (i % 10) * 95);
      const operation = operations[i % operations.length];

      rows.push({
        id: i + 1,
        direction: isIncome ? 'Приход' : 'Уход',
        dateTime: this.formatDateTime(point),
        machineAddress: this.machineAddressByIndex(i),
        amount,
        operation,
        side: isIncome ? 'Покупатель' : 'Пользователь',
        description: operation === 'Корректировка' ? 'Корректировка баланса после сверки' : '',
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

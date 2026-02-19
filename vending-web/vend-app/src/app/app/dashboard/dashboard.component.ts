import { CommonModule, CurrencyPipe, DecimalPipe } from '@angular/common';
import { Component, OnDestroy, computed, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

type MenuItem = {
  label: string;
  icon: string;
  section: string;
};

type KpiItem = {
  title: string;
  value: string;
  color: string;
  link: string;
  sparkline: string;
};

type PaymentItem = {
  method: string;
  value: number;
};

type StatusItem = {
  name: string;
  value: number;
  color: string;
};

type ProductRow = {
  name: string;
  price: number;
  quantity: number;
  amount: number;
  profit: number;
};

type YearBar = {
  label: string;
  value: number;
};

type DashboardToastKind = 'warning' | 'info' | 'success';

type DashboardToast = {
  id: number;
  kind: DashboardToastKind;
  message: string;
};

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, DecimalPipe, CurrencyPipe],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnDestroy {
  readonly isLoading = signal(true);
  readonly sidebarCollapsed = signal(false);
  readonly mobileSidebarOpen = signal(false);
  readonly profileMenuOpen = signal(false);
  readonly darkTheme = signal(false);
  readonly notificationsCount = signal(7);
  readonly activeMenu = signal('Панель');
  readonly selectedMonth = signal('Апрель 2025');
  readonly selectedSalesPeriod = signal('За год');
  readonly searchQuery = signal('');
  readonly productSortBy = signal<'amount' | 'profit' | 'quantity'>('amount');
  readonly productSortDir = signal<'asc' | 'desc'>('desc');
  readonly toasts = signal<DashboardToast[]>([]);

  readonly revenueToday = 5126;
  readonly revenueYesterday = 4988;
  readonly revenueAverage = 4720;
  readonly offlineMachinesCount = 12;
  readonly refillRequiredCount = 4;

  private toastId = 0;
  private readonly toastTimers = new Map<number, ReturnType<typeof setTimeout>>();

  readonly breadcrumb = ['Панели', 'Основная'];

  readonly menuGroups: { title: string; items: MenuItem[] }[] = [
    {
      title: 'Автоматы',
      items: [
        { label: 'Список автоматов', icon: '🗂️', section: 'Список автоматов' },
        { label: 'Активные автоматы', icon: '✅', section: 'Активные автоматы' },
        { label: 'Неактивные автоматы', icon: '⛔', section: 'Неактивные автоматы' },
        { label: 'Заказы', icon: '🛒', section: 'Заказы' },
        { label: 'Акции и купоны', icon: '🎟️', section: 'Акции и купоны' }
      ]
    },
    {
      title: 'Финансы',
      items: [
        { label: 'Выручка', icon: '💰', section: 'Выручка' },
        { label: 'Транзакции', icon: '💳', section: 'Транзакции' }
      ]
    },
    {
      title: 'Администрирование',
      items: [
        { label: 'Пользователи', icon: '👥', section: 'Пользователи' },
        { label: 'Компания', icon: '🏢', section: 'Компания' }
      ]
    },
    {
      title: 'Поддержка',
      items: [
        { label: 'Тикеты', icon: '🎫', section: 'Тикеты' },
        { label: 'Помощь и поддержка', icon: '🛟', section: 'Помощь и поддержка' }
      ]
    }
  ];

  readonly kpis: KpiItem[] = [
    {
      title: 'Продажи',
      value: '10,405,000',
      color: '#f03b62',
      link: '/app/dashboard?view=sales',
      sparkline: 'M0,28 C10,20 20,14 30,20 C40,25 50,8 60,12 C70,22 80,11 90,8 C100,6 106,2 110,3'
    },
    {
      title: 'Транзакции',
      value: '17,465',
      color: '#c96a00',
      link: '/app/dashboard?view=transactions',
      sparkline: 'M0,35 C10,34 20,20 30,27 C40,36 50,21 60,17 C70,21 80,9 90,15 C100,11 106,4 110,5'
    },
    {
      title: 'Клиенты',
      value: '13,472',
      color: '#6a62d2',
      link: '/app/dashboard?view=clients',
      sparkline: 'M0,34 C10,30 20,12 30,22 C40,32 50,13 60,16 C70,22 80,8 90,12 C100,8 106,2 110,6'
    },
    {
      title: 'Автоматы',
      value: '2,046',
      color: '#2f9ad8',
      link: '/app/dashboard?view=machines',
      sparkline: 'M0,30 C10,15 20,35 30,22 C40,10 50,18 60,9 C70,5 80,25 90,11 C95,7 100,4 110,8'
    },
    {
      title: 'Активные автоматы',
      value: '2,012',
      color: '#e02cb3',
      link: '/app/dashboard?view=active-machines',
      sparkline: 'M0,28 C10,32 20,24 30,14 C40,8 50,25 60,19 C70,8 80,10 90,6 C100,5 106,2 110,4'
    },
    {
      title: 'Неактивные автоматы',
      value: '34',
      color: '#ff7848',
      link: '/app/dashboard?view=inactive-machines',
      sparkline: 'M0,30 C10,26 20,18 30,22 C40,31 50,18 60,12 C70,6 80,24 90,15 C100,7 106,4 110,6'
    }


  ];

  readonly payments: PaymentItem[] = [
    { method: 'Наличные', value: 135 },
    { method: 'WEB / Кошелек', value: 84 },
    { method: 'Дебетовая карта', value: 61 },
    { method: 'Н/Д', value: 11 },
    { method: 'Кредиты', value: 23 }
  ];

  readonly operationStatus: StatusItem[] = [
    { name: 'Онлайн', value: 72, color: '#20b26b' },
    { name: 'Офлайн', value: 14, color: '#e53935' },
    { name: 'Остановлен (планово)', value: 8, color: '#f39c12' },
    { name: 'Остановлен', value: 4, color: '#c62828' },
    { name: 'Ожидание', value: 9, color: '#5c7cfa' },
    { name: 'Выведен из эксплуатации', value: 2, color: '#5f6368' },
    { name: 'Н/Д', value: 1, color: '#8d8d8d' }
  ];

  readonly topProducts = signal<ProductRow[]>([
    { name: 'Вода', price: 30, quantity: 82, amount: 6518.18, profit: 1580.3 },
    { name: 'Бутылки', price: 20, quantity: 37, amount: 4754.5, profit: 1120.2 },
    { name: 'Лед', price: 30, quantity: 64, amount: 2559.36, profit: 740.1 },
    { name: 'Озон', price: 40, quantity: 184, amount: 3680, profit: 1099.8 },
    { name: 'Стаканы', price: 20, quantity: 64, amount: 1965.81, profit: 590.2 }
  ]);

  readonly filteredProducts = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const sortBy = this.productSortBy();
    const sortDir = this.productSortDir();

    const result = this.topProducts().filter((item) =>
      !query ? true : item.name.toLowerCase().includes(query)
    );

    result.sort((a, b) => {
      const delta = a[sortBy] - b[sortBy];
      return sortDir === 'asc' ? delta : -delta;
    });

    return result;
  });

  readonly totalPayments = computed(() =>
    this.payments.reduce((sum, item) => sum + item.value, 0)
  );

  readonly monthlyExpenses = 6078.76;
  readonly monthlyRevenue = 11690.2;
  readonly monthlyProfit = 5611.44;
  readonly marginPercent = 48;

  readonly yearSales: YearBar[] = [
    { label: 'Янв', value: 22000 },
    { label: 'Фев', value: 14000 },
    { label: 'Мар', value: 20000 },
    { label: 'Апр', value: 21000 },
    { label: 'Май', value: 20800 },
    { label: 'Июн', value: 12000 },
    { label: 'Июл', value: 17000 },
    { label: 'Авг', value: 20500 },
    { label: 'Сен', value: 11800 },
    { label: 'Окт', value: 22000 },
    { label: 'Ноя', value: 17000 },
    { label: 'Дек', value: 14000 }
  ];

  constructor(
    private authService: AuthService,
    private router: Router
  ) {
    setTimeout(() => {
      this.isLoading.set(false);
      this.showInitialToasts();
    }, 800);
  }

  toggleTheme(): void {
    this.darkTheme.update((value) => !value);
  }

  toggleSidebar(): void {
    this.sidebarCollapsed.update((value) => !value);
  }

  toggleMobileSidebar(): void {
    this.mobileSidebarOpen.update((value) => !value);
  }

  toggleProfileMenu(): void {
    this.profileMenuOpen.update((value) => !value);
  }

  setMonth(month: string): void {
    this.selectedMonth.set(month);
  }

  setSalesPeriod(period: string): void {
    this.selectedSalesPeriod.set(period);
  }

  setSearch(query: string): void {
    this.searchQuery.set(query);
  }

  activateSection(section: string): void {
    this.activeMenu.set(section);
    this.mobileSidebarOpen.set(false);
  }

  sortProducts(by: 'amount' | 'profit' | 'quantity'): void {
    if (this.productSortBy() === by) {
      this.productSortDir.update((dir) => (dir === 'asc' ? 'desc' : 'asc'));
      return;
    }

    this.productSortBy.set(by);
    this.productSortDir.set('desc');
  }

  paymentPercent(value: number): number {
    return (value / this.totalPayments()) * 100;
  }

  donutBackground(): string {
    const total = this.totalPayments();
    if (!total) return 'conic-gradient(#d4d4d8 0deg 360deg)';

    const colors = ['#20b26b', '#2f9ad8', '#6a62d2', '#9ca3af', '#f59e0b'];
    let degreeCursor = 0;

    const segments = this.payments.map((payment, idx) => {
      const degree = (payment.value / total) * 360;
      const start = degreeCursor;
      const end = degreeCursor + degree;
      degreeCursor = end;
      return `${colors[idx % colors.length]} ${start}deg ${end}deg`;
    });

    return `conic-gradient(${segments.join(',')})`;
  }

  maxYearSales(): number {
    return Math.max(...this.yearSales.map((item) => item.value));
  }

  yearBarHeight(value: number): number {
    return (value / this.maxYearSales()) * 100;
  }

  trackByLabel(_: number, item: MenuItem): string {
    return item.label;
  }

  trackByKpi(_: number, item: KpiItem): string {
    return item.title;
  }

  trackByProduct(_: number, item: ProductRow): string {
    return item.name;
  }

  dismissToast(id: number): void {
    const timer = this.toastTimers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.toastTimers.delete(id);
    }

    this.toasts.update((items) => items.filter((item) => item.id !== id));
  }

  private showInitialToasts(): void {
    this.pushToast('warning', `⚠️ ${this.offlineMachinesCount} автоматов офлайн`);
    this.pushToast('info', `🧃 ${this.refillRequiredCount} требуют пополнения`, 5200);
    this.pushToast('success', `📈 Выручка сегодня: ${this.revenueToday.toLocaleString('ru-RU')} ₽`, 6200);
  }

  private pushToast(kind: DashboardToastKind, message: string, timeoutMs = 4500): void {
    const id = ++this.toastId;
    this.toasts.update((items) => [...items, { id, kind, message }]);

    const timer = setTimeout(() => this.dismissToast(id), timeoutMs);
    this.toastTimers.set(id, timer);
  }

  ngOnDestroy(): void {
    this.toastTimers.forEach((timer) => clearTimeout(timer));
    this.toastTimers.clear();
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }
}

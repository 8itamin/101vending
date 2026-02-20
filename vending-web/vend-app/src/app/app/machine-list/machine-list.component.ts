import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';

type LevelTone = 'good' | 'warn' | 'bad';
type MessageKind = 'error' | 'command' | 'notice';

type MachineItem = {
  id: string;
  number: string;
  city: string;
  folder: string;
  address: string;
  isWorking: boolean;
  unreadEvents: number;
  waterLiters: number;
  waterTone: LevelTone;
  bottles: number;
  monthlySales: number;
  cash: number;
  temperatureC: number;
  temperatureTone: LevelTone;
  connected: boolean;
};

type MachineFolder = {
  id: string;
  title: string;
  expanded: boolean;
  machines: MachineItem[];
};

type MachineCity = {
  id: string;
  title: string;
  expanded: boolean;
  folders: MachineFolder[];
};

type TreeRow =
  | { key: string; kind: 'city'; cityId: string; title: string; expanded: boolean }
  | { key: string; kind: 'folder'; cityId: string; folderId: string; title: string; expanded: boolean }
  | { key: string; kind: 'machine'; machine: MachineItem };

type DetailLine = {
  label: string;
  value: string;
};

type DetailSection = {
  id: string;
  title: string;
  expanded: boolean;
  lines: DetailLine[];
};

type MessageRow = {
  id: number;
  status: MessageKind;
  dateTime: string;
  code: string;
  description: string;
};

type FileRow = {
  id: number;
  name: string;
  type: string;
  size: string;
  date: string;
  path: string;
};

type CommandRow = {
  id: number;
  command: string;
  date: string;
  user: string;
  machine: string;
  result: string;
  commandType: string;
  status: string;
};

type SoftwareRow = {
  moduleName: string;
  serialNumber: string;
};

type MachineDetails = {
  sections: DetailSection[];
  messages: MessageRow[];
  files: FileRow[];
  commands: CommandRow[];
  software: SoftwareRow[];
  settings: {
    id: string;
    group: string;
    address: string;
    workTime: string;
    nightMode: boolean;
    priceFile: string;
    logo: string;
    waterCapacity: string;
    bottlesCapacity: string;
    version: string;
    ip: string;
    machineTime: string;
    warranty: string;
  };
  addition: {
    waterBalance: string;
    bottlesBalance: string;
    productionDate: string;
  };
};

@Component({
  selector: 'app-machine-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './machine-list.component.html',
  styleUrl: './machine-list.component.css'
})
export class MachineListComponent {
  readonly tabs = [
    { id: 'details', label: 'Детализация' },
    { id: 'messages', label: 'Сообщения' },
    { id: 'settings', label: 'Настройки' },
    { id: 'files', label: 'Файлы' },
    { id: 'commands', label: 'Команды' },
    { id: 'addition', label: 'Добавление товара' },
    { id: 'software', label: 'ПО' }
  ] as const;

  readonly selectedTab = signal<(typeof this.tabs)[number]['id']>('details');
  readonly pageSize = 25;
  readonly messagesPage = signal(1);
  readonly selectedMachineId = signal('vm-001');

  readonly machineTree = signal<MachineCity[]>([
    {
      id: 'city-spb',
      title: 'Санкт-Петербург',
      expanded: true,
      folders: [
        {
          id: 'folder-center',
          title: 'Центр',
          expanded: true,
          machines: [
            {
              id: 'vm-001',
              number: '001',
              city: 'Санкт-Петербург',
              folder: 'Центр',
              address: 'Невский пр., 10',
              isWorking: true,
              unreadEvents: 6,
              waterLiters: 3920,
              waterTone: 'good',
              bottles: 1,
              monthlySales: 321,
              cash: 47976,
              temperatureC: 24,
              temperatureTone: 'good',
              connected: true
            },
            {
              id: 'vm-002',
              number: '002',
              city: 'Санкт-Петербург',
              folder: 'Центр',
              address: 'Литейный пр., 34',
              isWorking: false,
              unreadEvents: 12,
              waterLiters: 620,
              waterTone: 'bad',
              bottles: 0,
              monthlySales: 97,
              cash: 11120,
              temperatureC: 34,
              temperatureTone: 'bad',
              connected: false
            }
          ]
        },
        {
          id: 'folder-north',
          title: 'Север',
          expanded: false,
          machines: [
            {
              id: 'vm-003',
              number: '003',
              city: 'Санкт-Петербург',
              folder: 'Север',
              address: 'ул. Есенина, 12',
              isWorking: true,
              unreadEvents: 1,
              waterLiters: 1850,
              waterTone: 'warn',
              bottles: 3,
              monthlySales: 212,
              cash: 28330,
              temperatureC: 27,
              temperatureTone: 'warn',
              connected: true
            }
          ]
        }
      ]
    },
    {
      id: 'city-moscow',
      title: 'Москва',
      expanded: false,
      folders: [
        {
          id: 'folder-east',
          title: 'Восток',
          expanded: false,
          machines: [
            {
              id: 'vm-004',
              number: '004',
              city: 'Москва',
              folder: 'Восток',
              address: 'Щелковское ш., 75',
              isWorking: true,
              unreadEvents: 0,
              waterLiters: 2400,
              waterTone: 'good',
              bottles: 5,
              monthlySales: 255,
              cash: 33770,
              temperatureC: 25,
              temperatureTone: 'good',
              connected: true
            }
          ]
        }
      ]
    }
  ]);

  readonly detailsByMachine: Record<string, MachineDetails> = {
    'vm-001': this.buildDetails('001', 'Санкт-Петербург / Центр / Невский пр., 10'),
    'vm-002': this.buildDetails('002', 'Санкт-Петербург / Центр / Литейный пр., 34'),
    'vm-003': this.buildDetails('003', 'Санкт-Петербург / Север / ул. Есенина, 12'),
    'vm-004': this.buildDetails('004', 'Москва / Восток / Щелковское ш., 75')
  };

  readonly treeRows = computed<TreeRow[]>(() => {
    const rows: TreeRow[] = [];

    this.machineTree().forEach((city) => {
      rows.push({
        key: city.id,
        kind: 'city',
        cityId: city.id,
        title: city.title,
        expanded: city.expanded
      });

      if (!city.expanded) {
        return;
      }

      city.folders.forEach((folder) => {
        rows.push({
          key: `${city.id}-${folder.id}`,
          kind: 'folder',
          cityId: city.id,
          folderId: folder.id,
          title: folder.title,
          expanded: folder.expanded
        });

        if (!folder.expanded) {
          return;
        }

        folder.machines.forEach((machine) => {
          rows.push({
            key: machine.id,
            kind: 'machine',
            machine
          });
        });
      });
    });

    return rows;
  });

  readonly selectedMachine = computed(() => {
    const targetId = this.selectedMachineId();

    for (const city of this.machineTree()) {
      for (const folder of city.folders) {
        const found = folder.machines.find((machine) => machine.id === targetId);
        if (found) {
          return found;
        }
      }
    }

    return this.machineTree()[0]?.folders[0]?.machines[0] ?? null;
  });

  readonly currentDetails = computed(() => {
    const machine = this.selectedMachine();
    if (!machine) {
      return null;
    }

    return this.detailsByMachine[machine.id] ?? null;
  });

  readonly messages = computed(() => this.currentDetails()?.messages ?? []);

  readonly pagedMessages = computed(() => {
    const start = (this.messagesPage() - 1) * this.pageSize;
    return this.messages().slice(start, start + this.pageSize);
  });

  readonly totalMessagePages = computed(() =>
    Math.max(1, Math.ceil(this.messages().length / this.pageSize))
  );

  setTab(tabId: (typeof this.tabs)[number]['id']): void {
    this.selectedTab.set(tabId);
  }

  toggleCity(cityId: string): void {
    this.machineTree.update((cities) =>
      cities.map((city) =>
        city.id === cityId
          ? { ...city, expanded: !city.expanded }
          : city
      )
    );
  }

  toggleFolder(cityId: string, folderId: string): void {
    this.machineTree.update((cities) =>
      cities.map((city) => {
        if (city.id !== cityId) {
          return city;
        }

        return {
          ...city,
          folders: city.folders.map((folder) =>
            folder.id === folderId
              ? { ...folder, expanded: !folder.expanded }
              : folder
          )
        };
      })
    );
  }

  selectMachine(machineId: string): void {
    this.selectedMachineId.set(machineId);
    this.messagesPage.set(1);
  }

  nextMessagesPage(): void {
    this.messagesPage.update((page) => Math.min(page + 1, this.totalMessagePages()));
  }

  prevMessagesPage(): void {
    this.messagesPage.update((page) => Math.max(page - 1, 1));
  }

  toggleSection(sectionId: string): void {
    const details = this.currentDetails();
    const machine = this.selectedMachine();
    if (!details || !machine) {
      return;
    }

    const updated: MachineDetails = {
      ...details,
      sections: details.sections.map((section) =>
        section.id === sectionId
          ? { ...section, expanded: !section.expanded }
          : section
      )
    };

    this.detailsByMachine[machine.id] = updated;
    this.selectedMachineId.update((id) => id);
  }

  toneClass(tone: LevelTone): string {
    if (tone === 'good') return 'tone-good';
    if (tone === 'warn') return 'tone-warn';
    return 'tone-bad';
  }

  messageStatusClass(status: MessageKind): string {
    if (status === 'error') return 'status-error';
    if (status === 'command') return 'status-command';
    return 'status-notice';
  }

  messageStatusLabel(status: MessageKind): string {
    if (status === 'error') return 'Ошибка';
    if (status === 'command') return 'Команда';
    return 'Уведомление';
  }

  private buildDetails(machineNumber: string, address: string): MachineDetails {
    return {
      sections: [
        {
          id: 'products',
          title: 'Продукция',
          expanded: true,
          lines: [
            { label: 'Вода', value: '3920 л (продано за сутки: 321)' },
            { label: 'Тара в лотке', value: '1 (продано за сутки: 0)' },
            { label: 'Пробки в лотке', value: '1 (продано за сутки: 0)' }
          ]
        },
        {
          id: 'traffic',
          title: 'Интернет трафик',
          expanded: true,
          lines: [
            { label: 'За день', value: '150 Кб' },
            { label: 'За месяц', value: '950 Кб' }
          ]
        },
        {
          id: 'cash',
          title: 'Наличные',
          expanded: true,
          lines: [
            { label: 'Монеты разменка', value: '2500 руб. (1р:78, 5р:30, 10р:150)' },
            { label: 'Монеты денежный ящик', value: '8817 руб. (1р:78, 5р:30, 10р:150)' },
            { label: 'Купюры', value: '37410 руб. (10р:37)' },
            { label: 'Всего', value: '47976 руб.' }
          ]
        },
        {
          id: 'cashless',
          title: 'Безналичные',
          expanded: false,
          lines: [
            { label: 'Банковские карты', value: '4477,30 руб.' }
          ]
        },
        {
          id: 'actions',
          title: 'Действия',
          expanded: false,
          lines: [
            { label: 'Последняя заправка', value: '20.02.2026 08:08:01: Заправка 4600 литров' },
            { label: 'Последняя инкассация', value: '20.02.2026 08:08:01: Инкассировано: Монетами 10руб=150 Сумма всего 1500 руб.' }
          ]
        },
        {
          id: 'climate',
          title: 'Климат',
          expanded: false,
          lines: [
            { label: 'Температура', value: '20.02.2026 08:08:01: 24C' },
            { label: 'Влажность', value: '20.02.2026 08:08:01: 0%' }
          ]
        },
        {
          id: 'status',
          title: 'Статус',
          expanded: true,
          lines: [
            { label: 'Активность', value: 'На связи' }
          ]
        }
      ],
      messages: Array.from({ length: 31 }).map((_, idx) => {
        const id = idx + 1;
        const status: MessageKind = id % 7 === 0 ? 'error' : id % 4 === 0 ? 'command' : 'notice';
        return {
          id,
          status,
          dateTime: `20.02.2026 08:${(10 + idx).toString().padStart(2, '0')}:01`,
          code: `M-${machineNumber}-${id.toString().padStart(3, '0')}`,
          description:
            status === 'error'
              ? 'Нет связи с датчиком'
              : status === 'command'
                ? 'Выполнена команда обновления'
                : 'Плановое сообщение от автомата'
        };
      }),
      settings: {
        id: machineNumber,
        group: 'Базовая группа',
        address,
        workTime: '08:00 - 22:00',
        nightMode: false,
        priceFile: 'price-list-main.csv',
        logo: 'logo-company.svg',
        waterCapacity: '4600 л',
        bottlesCapacity: '24 шт',
        version: 'v2.14.8',
        ip: '10.10.20.31',
        machineTime: '20.02.2026 10:14:00',
        warranty: '13 месяцев'
      },
      files: [
        { id: 1, name: 'price-list-main.csv', type: 'csv', size: '18 Кб', date: '20.02.2026', path: '/files/prices/' },
        { id: 2, name: 'logo-company.svg', type: 'svg', size: '112 Кб', date: '17.02.2026', path: '/files/branding/' },
        { id: 3, name: 'firmware.bin', type: 'bin', size: '4.2 Мб', date: '11.02.2026', path: '/files/fw/' }
      ],
      commands: [
        {
          id: 1,
          command: 'Обновить ПО',
          date: '20.02.2026 09:08:01',
          user: 'operator@company',
          machine: machineNumber,
          result: 'Ожидание',
          commandType: 'Сервисная',
          status: 'В очереди'
        },
        {
          id: 2,
          command: 'Перезагрузить контроллер',
          date: '20.02.2026 08:08:01',
          user: 'operator@company',
          machine: machineNumber,
          result: 'Успешно',
          commandType: 'Сервисная',
          status: 'Выполнена'
        }
      ],
      addition: {
        waterBalance: '3920 л',
        bottlesBalance: '1 шт',
        productionDate: '2026-02-20'
      },
      software: [
        { moduleName: 'Контроллер продаж', serialNumber: `SN-${machineNumber}-CTL` },
        { moduleName: 'Платежный модуль', serialNumber: `SN-${machineNumber}-PAY` },
        { moduleName: 'Телеметрия', serialNumber: `SN-${machineNumber}-TLM` }
      ]
    };
  }
}

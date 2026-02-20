import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

type DocRow = {
  id: number;
  title: string;
  url: string;
};

@Component({
  selector: 'app-help-support',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './help-support.component.html',
  styleUrl: './help-support.component.css'
})
export class HelpSupportComponent {
  readonly docs: DocRow[] = [
    { id: 1, title: 'Руководство оператора', url: 'https://example.com/docs/operator' },
    { id: 2, title: 'Инструкция по инкассации', url: 'https://example.com/docs/cashbox' },
    { id: 3, title: 'Справка по уведомлениям', url: 'https://example.com/docs/alerts' }
  ];
}

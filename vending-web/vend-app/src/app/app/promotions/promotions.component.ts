import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

type PromotionRow = {
  id: number;
  title: string;
  period: string;
  canBuy: boolean;
};

@Component({
  selector: 'app-promotions',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './promotions.component.html',
  styleUrl: './promotions.component.css'
})
export class PromotionsComponent {
  readonly promotions: PromotionRow[] = [
    {
      id: 1,
      title: 'В честь 8 марта',
      period: '8 марта',
      canBuy: true
    },
    {
      id: 2,
      title: 'Дезинфекция автомата со скидкой 8%',
      period: '8 марта',
      canBuy: false
    }
  ];
}

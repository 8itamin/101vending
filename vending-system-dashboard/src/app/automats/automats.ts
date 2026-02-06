import { Component, OnInit } from '@angular/core';
import { io } from 'socket.io-client';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-automats',
  standalone: true, // Отметим, что компонент standalone
  templateUrl: './automats.component.html',
  styleUrls: ['./automats.component.css']
})

export class AutomatsComponent implements OnInit {
  private socket: any;
  automats: any[] = [];

  constructor(private http: HttpClient) { }

  ngOnInit(): void {
    // Устанавливаем соединение с сервером через WebSocket
    this.socket = io('http://localhost:3000');  // URL вашего сервера
    this.socket.on('automat_update', (data: any) => {
      console.log('Received real-time update:', data);
      this.updateAutomatData(data);
    });

    this.fetchAutomatsData();  // Получаем данные с сервера
  }

  fetchAutomatsData() {
    this.http.get('http://localhost:3000/api/automats')
      .subscribe((data: any) => {
        this.automats = data;
      });
  }

  updateAutomatData(data: any) {
    // Обновляем данные об автоматах в UI
    const index = this.automats.findIndex((automat: any) => automat.machineId === data.machineId);
    if (index !== -1) {
      this.automats[index] = { ...this.automats[index], ...data };
    } else {
      this.automats.push(data);
    }
  }
}
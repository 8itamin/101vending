import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { io, Socket } from 'socket.io-client';

@Component({
  selector: 'app-automats',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './automats.html',
  styleUrl: './automats.scss'
})
export class AutomatsComponent implements OnInit {
  private socket?: Socket;
  automats: any[] = [];

  constructor(private readonly http: HttpClient) {}

  ngOnInit(): void {
    this.socket = io('http://localhost:3000');
    this.socket.on('automat_update', (data: any) => {
      this.updateAutomatData(data);
    });

    this.fetchAutomatsData();
  }

  fetchAutomatsData(): void {
    this.http.get<any[]>('http://localhost:3000/api/automats').subscribe((data) => {
      this.automats = data;
    });
  }

  updateAutomatData(data: any): void {
    const index = this.automats.findIndex((automat: any) => automat.machineId === data.machineId);
    if (index !== -1) {
      this.automats[index] = { ...this.automats[index], ...data };
    } else {
      this.automats.push(data);
    }
  }
}

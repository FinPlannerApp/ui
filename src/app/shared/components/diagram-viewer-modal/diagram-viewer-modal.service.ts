import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class DiagramViewerModalService {
  isOpen = signal<boolean>(false);
  svgContent = signal<string>('');
  rawCode = signal<string>('');
  title = signal<string>('Interactive Diagram Viewer');
  scale = signal<number>(1);
  position = signal<{ x: number; y: number }>({ x: 0, y: 0 });

  openModal(svgContent: string, title: string = 'Interactive Diagram Viewer', rawCode: string = ''): void {
    this.svgContent.set(svgContent);
    this.rawCode.set(rawCode);
    this.title.set(title);
    this.scale.set(1);
    this.position.set({ x: 0, y: 0 });
    this.isOpen.set(true);
  }

  closeModal(): void {
    this.isOpen.set(false);
  }

  zoomIn(): void {
    this.scale.update(s => Math.min(4, +(s + 0.25).toFixed(2)));
  }

  zoomOut(): void {
    this.scale.update(s => Math.max(0.4, +(s - 0.25).toFixed(2)));
  }

  resetZoom(): void {
    this.scale.set(1);
    this.position.set({ x: 0, y: 0 });
  }
}

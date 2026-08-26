import { Component, inject, HostListener, ElementRef, ViewChild, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { DiagramViewerModalService } from './diagram-viewer-modal.service';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-diagram-viewer-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (modalService.isOpen()) {
      <div 
        class="fixed inset-0 z-[9999] flex flex-col bg-slate-950/90 backdrop-blur-xl text-slate-100 font-['Outfit',sans-serif] animate-fade-in select-none"
        (keydown.escape)="modalService.closeModal()"
        tabindex="0">
        
        <!-- Header Controls Bar -->
        <header class="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-slate-900/60 backdrop-blur-md shrink-0">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <i class="pi pi-sitemap text-lg"></i>
            </div>
            <div>
              <h3 class="text-base font-semibold text-white tracking-wide m-0">{{ modalService.title() }}</h3>
              <p class="text-xs text-slate-400 m-0">Scroll or pinch to zoom • Drag to pan</p>
            </div>
          </div>

          <!-- Actions & Zoom Tools -->
          <div class="flex items-center gap-2">
            <!-- Mode Toggle -->
            <div class="flex items-center bg-slate-800/80 p-1 rounded-xl border border-white/10 mr-2">
              <button 
                class="px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5"
                [class]="activeTab() === 'diagram' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'"
                (click)="activeTab.set('diagram')">
                <i class="pi pi-eye text-xs"></i>
                Diagram
              </button>
              @if (modalService.rawCode()) {
                <button 
                  class="px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5"
                  [class]="activeTab() === 'code' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'"
                  (click)="activeTab.set('code')">
                  <i class="pi pi-code text-xs"></i>
                  Source Code
                </button>
              }
            </div>

            @if (activeTab() === 'diagram') {
              <!-- Zoom Controls -->
              <div class="flex items-center bg-slate-800/80 rounded-xl border border-white/10 p-1">
                <button 
                  class="p-2 rounded-lg text-slate-300 hover:bg-white/10 hover:text-white transition-all disabled:opacity-30" 
                  title="Zoom Out (-)"
                  (click)="modalService.zoomOut()">
                  <i class="pi pi-minus text-xs"></i>
                </button>

                <span class="px-2 text-xs font-mono font-semibold text-indigo-300 min-w-[3.5rem] text-center">
                  {{ (modalService.scale() * 100).toFixed(0) }}%
                </span>

                <button 
                  class="p-2 rounded-lg text-slate-300 hover:bg-white/10 hover:text-white transition-all" 
                  title="Zoom In (+)"
                  (click)="modalService.zoomIn()">
                  <i class="pi pi-plus text-xs"></i>
                </button>

                <button 
                  class="p-2 rounded-lg text-slate-300 hover:bg-white/10 hover:text-white transition-all ml-1 border-l border-white/10" 
                  title="Reset Scale & Position"
                  (click)="modalService.resetZoom()">
                  <i class="pi pi-refresh text-xs"></i>
                </button>
              </div>

              <!-- Export SVG -->
              <button 
                class="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-white/10 transition-all flex items-center gap-2 text-xs font-medium"
                title="Download SVG"
                (click)="downloadSvg()">
                <i class="pi pi-download text-xs text-indigo-400"></i>
                <span class="hidden sm:inline">Export</span>
              </button>
            } @else {
              <!-- Copy Code -->
              <button 
                class="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-all flex items-center gap-2 text-xs font-medium shadow-lg shadow-indigo-600/30"
                (click)="copyCode()">
                <i class="pi pi-copy text-xs"></i>
                <span>Copy Code</span>
              </button>
            }

            <!-- Close Button -->
            <button 
              class="p-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-all ml-2"
              title="Close (Esc)"
              (click)="modalService.closeModal()">
              <i class="pi pi-times text-sm"></i>
            </button>
          </div>
        </header>

        <!-- Main Workspace Area -->
        <main 
          #viewport
          class="flex-1 relative overflow-hidden flex items-center justify-center cursor-grab active:cursor-grabbing bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px]"
          (mousedown)="onMouseDown($event)"
          (mousemove)="onMouseMove($event)"
          (mouseup)="onMouseUp()"
          (mouseleave)="onMouseUp()"
          (wheel)="onWheel($event)">
          
          @if (activeTab() === 'diagram') {
            <div 
              class="transition-transform duration-75 origin-center p-8 flex items-center justify-center"
              [style.transform]="'translate(' + modalService.position().x + 'px, ' + modalService.position().y + 'px) scale(' + modalService.scale() + ')'"
              [innerHTML]="safeSvg">
            </div>
          } @else {
            <div class="w-full max-w-4xl h-full p-6 overflow-auto font-mono text-sm text-slate-200">
              <pre class="p-6 rounded-2xl bg-slate-900/90 border border-white/10 overflow-x-auto select-text font-mono leading-relaxed">{{ modalService.rawCode() }}</pre>
            </div>
          }

          <!-- Floating Helper Hint -->
          <div class="absolute bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-slate-900/80 border border-white/10 text-slate-400 text-xs flex items-center gap-3 backdrop-blur-md pointer-events-none shadow-xl">
            <span class="flex items-center gap-1.5"><i class="pi pi-arrows-alt text-indigo-400"></i> Drag to Pan</span>
            <span class="w-1 h-1 rounded-full bg-slate-700"></span>
            <span class="flex items-center gap-1.5"><i class="pi pi-search text-indigo-400"></i> Scroll to Zoom</span>
            <span class="w-1 h-1 rounded-full bg-slate-700"></span>
            <span class="flex items-center gap-1.5"><i class="pi pi-exclamation-circle text-indigo-400"></i> Esc to Exit</span>
          </div>
        </main>
      </div>
    }
  `,
  styles: [`
    :host ::ng-deep svg {
      max-width: none !important;
      height: auto !important;
      user-select: none;
    }
  `]
})
export class DiagramViewerModalComponent {
  modalService = inject(DiagramViewerModalService);
  private sanitizer = inject(DomSanitizer);
  private notification = inject(NotificationService);

  @ViewChild('viewport') viewport!: ElementRef<HTMLElement>;

  activeTab = signal<'diagram' | 'code'>('diagram');
  isDragging = false;
  startX = 0;
  startY = 0;

  get safeSvg(): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(this.modalService.svgContent());
  }

  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if (!this.modalService.isOpen()) return;
    if (event.key === 'Escape') {
      this.modalService.closeModal();
    } else if (event.key === '+' || event.key === '=') {
      this.modalService.zoomIn();
    } else if (event.key === '-') {
      this.modalService.zoomOut();
    } else if (event.key === '0') {
      this.modalService.resetZoom();
    }
  }

  onMouseDown(event: MouseEvent): void {
    if (this.activeTab() !== 'diagram') return;
    this.isDragging = true;
    this.startX = event.clientX - this.modalService.position().x;
    this.startY = event.clientY - this.modalService.position().y;
  }

  onMouseMove(event: MouseEvent): void {
    if (!this.isDragging || this.activeTab() !== 'diagram') return;
    const x = event.clientX - this.startX;
    const y = event.clientY - this.startY;
    this.modalService.position.set({ x, y });
  }

  onMouseUp(): void {
    this.isDragging = false;
  }

  onWheel(event: WheelEvent): void {
    if (this.activeTab() !== 'diagram') return;
    event.preventDefault();
    if (event.deltaY < 0) {
      this.modalService.zoomIn();
    } else {
      this.modalService.zoomOut();
    }
  }

  downloadSvg(): void {
    const svgText = this.modalService.svgContent();
    if (!svgText) return;
    const blob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `diagram-${Date.now()}.svg`;
    link.click();
    URL.revokeObjectURL(url);
    this.notification.showSuccess('Diagram exported as SVG!');
  }

  copyCode(): void {
    const code = this.modalService.rawCode();
    if (code && navigator.clipboard) {
      navigator.clipboard.writeText(code);
      this.notification.showSuccess('Mermaid source code copied to clipboard!');
    }
  }
}

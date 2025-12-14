export class ImageLoader {
  private imageInput: HTMLInputElement;
  private loadButton: HTMLButtonElement;
  private dropZone: HTMLElement;
  private onLoadCallback: ((image: HTMLImageElement, filename: string) => void) | null = null;

  constructor() {
    this.imageInput = document.getElementById('image-input') as HTMLInputElement;
    this.loadButton = document.getElementById('load-image-btn') as HTMLButtonElement;
    this.dropZone = document.getElementById('drop-zone') as HTMLElement;

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.loadButton.addEventListener('click', () => {
      this.imageInput.click();
    });

    this.imageInput.addEventListener('change', (e) => {
      const input = e.target as HTMLInputElement;
      if (input.files && input.files[0]) {
        this.loadFile(input.files[0]);
      }
    });

    this.dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.dropZone.classList.add('border-blue-500', 'bg-gray-700');
    });

    this.dropZone.addEventListener('dragleave', () => {
      this.dropZone.classList.remove('border-blue-500', 'bg-gray-700');
    });

    this.dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      this.dropZone.classList.remove('border-blue-500', 'bg-gray-700');

      if (e.dataTransfer?.files && e.dataTransfer.files[0]) {
        this.loadFile(e.dataTransfer.files[0]);
      }
    });
  }

  private loadFile(file: File): void {
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        if (this.onLoadCallback) {
          this.onLoadCallback(img, file.name);
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  onLoad(callback: (image: HTMLImageElement, filename: string) => void): void {
    this.onLoadCallback = callback;
  }
}

/**
 * Button - Reusable button component
 */

import { createElement } from '../../utils/dom';

export type ButtonVariant = 'primary' | 'secondary';

export interface ButtonOptions {
  text: string;
  variant?: ButtonVariant;
  disabled?: boolean;
  onClick?: () => void;
}

export class Button {
  private element: HTMLButtonElement;
  private clickHandler?: () => void;

  constructor(options: ButtonOptions) {
    const { text, variant = 'primary', disabled = false, onClick } = options;
    this.clickHandler = onClick;

    const className = `btn btn--${variant}`;

    this.element = createElement('button', {
      className,
      textContent: text,
    }) as HTMLButtonElement;

    this.element.disabled = disabled;

    if (onClick) {
      this.element.addEventListener('click', onClick);
    }
  }

  /**
   * Get the DOM element
   */
  getElement(): HTMLButtonElement {
    return this.element;
  }

  /**
   * Enable/disable the button
   */
  setDisabled(disabled: boolean): void {
    this.element.disabled = disabled;
  }

  /**
   * Update button text
   */
  setText(text: string): void {
    this.element.textContent = text;
  }

  /**
   * Destroy the button and remove event listeners
   */
  destroy(): void {
    if (this.clickHandler) {
      this.element.removeEventListener('click', this.clickHandler);
    }
    this.element.remove();
  }
}

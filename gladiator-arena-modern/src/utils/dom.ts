/**
 * DOM utility functions for element manipulation
 */

/**
 * Query selector with type safety
 */
export function $(selector: string): HTMLElement | null {
  return document.querySelector(selector);
}

/**
 * Query selector that throws if element not found
 */
export function $required<T extends HTMLElement = HTMLElement>(
  selector: string
): T {
  const element = document.querySelector<T>(selector);
  if (!element) {
    throw new Error(`Required element not found: ${selector}`);
  }
  return element;
}

/**
 * Query all with type safety
 */
export function $$<T extends HTMLElement = HTMLElement>(
  selector: string
): NodeListOf<T> {
  return document.querySelectorAll<T>(selector);
}

/**
 * Create element with optional classes and attributes
 */
export function createElement<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  options?: {
    className?: string;
    classList?: string[];
    attributes?: Record<string, string>;
    innerHTML?: string;
    textContent?: string;
  }
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);

  if (options?.className) {
    element.className = options.className;
  }

  if (options?.classList) {
    element.classList.add(...options.classList);
  }

  if (options?.attributes) {
    Object.entries(options.attributes).forEach(([key, value]) => {
      element.setAttribute(key, value);
    });
  }

  if (options?.innerHTML) {
    element.innerHTML = options.innerHTML;
  }

  if (options?.textContent) {
    element.textContent = options.textContent;
  }

  return element;
}

/**
 * Show element
 */
export function show(element: HTMLElement): void {
  element.style.display = '';
  element.classList.remove('hidden');
}

/**
 * Hide element
 */
export function hide(element: HTMLElement): void {
  element.classList.add('hidden');
}

/**
 * Toggle element visibility
 */
export function toggle(element: HTMLElement, force?: boolean): void {
  if (force !== undefined) {
    force ? show(element) : hide(element);
  } else {
    element.classList.toggle('hidden');
  }
}

/**
 * Add event listener with automatic cleanup
 */
export function on<K extends keyof HTMLElementEventMap>(
  element: HTMLElement,
  event: K,
  handler: (event: HTMLElementEventMap[K]) => void,
  options?: AddEventListenerOptions
): () => void {
  element.addEventListener(event, handler as EventListener, options);

  // Return cleanup function
  return () => {
    element.removeEventListener(event, handler as EventListener, options);
  };
}

/**
 * Remove all children from element
 */
export function empty(element: HTMLElement): void {
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
}

/**
 * Check if element has class
 */
export function hasClass(element: HTMLElement, className: string): boolean {
  return element.classList.contains(className);
}

/**
 * Add classes to element
 */
export function addClass(element: HTMLElement, ...classes: string[]): void {
  element.classList.add(...classes);
}

/**
 * Remove classes from element
 */
export function removeClass(element: HTMLElement, ...classes: string[]): void {
  element.classList.remove(...classes);
}

/**
 * Set element attribute
 */
export function attr(
  element: HTMLElement,
  name: string,
  value?: string
): string | null {
  if (value === undefined) {
    return element.getAttribute(name);
  }
  element.setAttribute(name, value);
  return value;
}

/**
 * Remove element attribute
 */
export function removeAttr(element: HTMLElement, name: string): void {
  element.removeAttribute(name);
}

/**
 * Trigger animation by removing and re-adding a class
 */
export function triggerAnimation(
  element: HTMLElement,
  animationClass: string
): void {
  element.classList.remove(animationClass);
  // Force reflow to restart animation
  void element.offsetHeight;
  element.classList.add(animationClass);
}

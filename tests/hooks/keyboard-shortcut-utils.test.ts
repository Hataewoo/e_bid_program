import { describe, expect, it } from 'vitest';
import { isEditableTarget, matchCrudShortcut } from '@/hooks/keyboard-shortcut-utils';

function mockElement(tagName: string, contentEditable = false): HTMLElement {
  return { tagName, isContentEditable: contentEditable } as HTMLElement;
}

function keyEvent(init: Partial<KeyboardEvent> & { key: string }): KeyboardEvent {
  return {
    key: init.key,
    ctrlKey: init.ctrlKey ?? false,
    metaKey: init.metaKey ?? false,
    altKey: init.altKey ?? false,
    defaultPrevented: init.defaultPrevented ?? false,
    target: init.target ?? null,
    preventDefault: () => undefined,
  } as KeyboardEvent;
}

describe('isEditableTarget', () => {
  it('detects input and textarea elements', () => {
    expect(isEditableTarget(mockElement('INPUT'))).toBe(true);
    expect(isEditableTarget(mockElement('TEXTAREA'))).toBe(true);
    expect(isEditableTarget(mockElement('SELECT'))).toBe(true);
    expect(isEditableTarget(mockElement('DIV'))).toBe(false);
    expect(isEditableTarget(mockElement('DIV', true))).toBe(true);
  });
});

describe('matchCrudShortcut', () => {
  it('matches Ctrl+S and F2', () => {
    expect(matchCrudShortcut(keyEvent({ key: 's', ctrlKey: true }))).toBe('save');
    expect(matchCrudShortcut(keyEvent({ key: 'F2' }))).toBe('new');
  });

  it('matches Delete outside editable controls', () => {
    expect(matchCrudShortcut(keyEvent({ key: 'Delete', target: mockElement('DIV') }))).toBe(
      'delete',
    );
  });

  it('ignores Delete inside text inputs', () => {
    expect(matchCrudShortcut(keyEvent({ key: 'Delete', target: mockElement('INPUT') }))).toBeNull();
  });
});

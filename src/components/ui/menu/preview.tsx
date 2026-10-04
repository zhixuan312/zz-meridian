'use client';

import { Check, ChevronDown, Copy, Download, KeyRound, MoreHorizontal, Trash2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Specimen, State } from '@/system/specimen';
import { MENU_CONTENT, MENU_ITEM, Menu, MenuContent, MenuItem, MenuTrigger } from '.';

/* The open menu is drawn statically with the menu's own classes, so every row state shows at once. */
function Row({ children, hi, tone, shortcut, checked, disabled }: { children: React.ReactNode; hi?: boolean; tone?: 'critical'; shortcut?: string; checked?: boolean; disabled?: boolean }) {
  return (
    <div data-highlighted={hi || undefined} data-disabled={disabled || undefined} className={cn(MENU_ITEM, checked !== undefined && 'pr-8', tone === 'critical' && 'text-critical-ink [&_svg]:text-critical-ink')}>
      {children}
      {shortcut ? <span className="ml-auto pl-4 text-xs text-ink-3">{shortcut}</span> : null}
      {checked ? <Check className="absolute right-2 !text-accent" strokeWidth={2.25} /> : null}
    </div>
  );
}

export default function MenuPreview() {
  return (
    <>
      <Specimen label="Open" note="Actions, a separator, then the destructive one last.">
        <div className={cn(MENU_CONTENT, 'w-60')}>
          <Row><Copy />Copy request ID<span className="ml-auto pl-4 text-xs text-ink-3">⌘C</span></Row>
          <Row hi><Download />Export as JSON</Row>
          <Row><KeyRound />View API key</Row>
          <Row disabled><KeyRound />Replay request</Row>
          <div className="-mx-1 my-1 h-px bg-line" />
          <Row tone="critical"><Trash2 />Delete log entry</Row>
        </div>
      </Specimen>
      <Specimen label="Choices" note="A radio group: the current choice carries the accent check.">
        <div className={cn(MENU_CONTENT, 'w-56')}>
          <p className="t-eyebrow px-2 pt-2 pb-1.5">Region</p>
          <Row checked>us-east-1</Row>
          <Row checked={false} hi>eu-west-1</Row>
          <Row checked={false}>ap-southeast-1</Row>
        </div>
      </Specimen>
      <Specimen label="Row states">
        <State label="Rest"><div className={cn(MENU_CONTENT, 'w-48')}><Row><Copy />Copy link</Row></div></State>
        <State label="Highlighted"><div className={cn(MENU_CONTENT, 'w-48')}><Row hi><Copy />Copy link</Row></div></State>
        <State label="Disabled"><div className={cn(MENU_CONTENT, 'w-48')}><Row disabled><Copy />Copy link</Row></div></State>
      </Specimen>
      <Specimen label="Live" note="Click to open; arrow keys move, Enter runs, Escape closes.">
        <Menu>
          <MenuTrigger className="press hit inline-flex h-(--control-md) items-center gap-2 rounded-md border border-line-strong bg-surface px-3 text-sm font-medium shadow-control hover:bg-surface-sunk">
            Actions <ChevronDown className="size-3.5 text-ink-3" />
          </MenuTrigger>
          <MenuContent>
            <MenuItem shortcut="⌘C"><Copy />Copy request ID</MenuItem>
            <MenuItem><Download />Export as JSON</MenuItem>
            <MenuItem tone="critical"><Trash2 />Delete log entry</MenuItem>
          </MenuContent>
        </Menu>
        <Menu>
          <MenuTrigger aria-label="More actions" className="press hit grid size-(--control-md) place-items-center rounded-md text-ink-3 hover:bg-fill-hover hover:text-ink">
            <MoreHorizontal className="size-4" />
          </MenuTrigger>
          <MenuContent align="end">
            <MenuItem><Copy />Copy request ID</MenuItem>
            <MenuItem><Download />Export as JSON</MenuItem>
          </MenuContent>
        </Menu>
      </Specimen>
    </>
  );
}

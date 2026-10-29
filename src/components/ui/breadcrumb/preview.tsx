'use client';

import { Specimen } from '@/system/specimen';
import { Breadcrumb } from '.';

export default function BreadcrumbPreview() {
  return (
    <>
      <Specimen label="Two levels" note="Above a record's title in the masthead.">
        <Breadcrumb items={[{ label: 'Requests', href: '/requests' }, { label: 'req_8f3k2m1x' }]} />
      </Specimen>
      <Specimen label="Four levels">
        <Breadcrumb items={[{ label: 'Customers', href: '/customers' }, { label: 'Parallax AI', href: '/customers' }, { label: 'API keys', href: '/keys' }, { label: 'Billing worker' }]} />
      </Specimen>
      <Specimen label="Folded" note="Past four levels the middle folds into a menu: the first and the last two stay.">
        <Breadcrumb items={[{ label: 'Workspace', href: '/' }, { label: 'Customers', href: '/customers' }, { label: 'Parallax AI', href: '/customers' }, { label: 'API keys', href: '/keys' }, { label: 'Billing worker', href: '/keys' }, { label: 'Rotation history' }]} />
      </Specimen>
      <Specimen label="Long names" note="The current page truncates first; ancestors keep their names.">
        <div className="w-full max-w-70">
          <Breadcrumb items={[{ label: 'Requests', href: '/requests' }, { label: 'POST /v1/documents/:id/attachments/upload' }]} />
        </div>
      </Specimen>
      <Specimen label="Long ancestors" note="Ancestors wider than the line truncate too, after the current page, and never run past it.">
        <div className="w-full max-w-70">
          <Breadcrumb items={[{ label: 'Northwind Logistics International Holdings', href: '/customers' }, { label: 'API keys', href: '/keys' }, { label: 'Billing worker' }]} />
        </div>
      </Specimen>
    </>
  );
}

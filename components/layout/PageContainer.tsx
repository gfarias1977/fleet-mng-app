import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { cn } from '@/lib/utils';
import React from 'react';

interface BreadcrumbEntry {
  label: string;
  href?: string;
}

interface PageContainerProps {
  heading?: string;
  breadcrumbs?: BreadcrumbEntry[];
  children: React.ReactNode;
  className?: string;
}

export function PageContainer({ heading, breadcrumbs, children, className }: PageContainerProps) {
  return (
    <div className={cn('flex flex-col gap-6 p-6', className)}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <Breadcrumb>
          <BreadcrumbList>
            {breadcrumbs.map((crumb, index) => {
              const isLast = index === breadcrumbs.length - 1;
              return (
                <React.Fragment key={crumb.label}>
                  <BreadcrumbItem>
                    {isLast ? (
                      <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink href={crumb.href ?? '#'}>{crumb.label}</BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                  {!isLast && <BreadcrumbSeparator />}
                </React.Fragment>
              );
            })}
          </BreadcrumbList>
        </Breadcrumb>
      )}
      {heading && (
        <h1 className="text-2xl font-semibold tracking-tight">{heading}</h1>
      )}
      {children}
    </div>
  );
}

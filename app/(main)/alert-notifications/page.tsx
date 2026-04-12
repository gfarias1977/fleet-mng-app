import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { getUserByEmail } from '@/data/users';
import {
  getAlertNotificationsPaginated,
  getAlertsForNotificationSelect,
} from '@/data/alert-notifications';
import { PageContainer } from '@/components/layout/PageContainer';
import { AlertNotificationsClient } from '@/components/alert-notifications/AlertNotificationsClient';
import type { AlertNotificationSortField } from '@/data/alert-notifications';

type Props = {
  searchParams: Promise<{
    page?: string;
    search?: string;
    sort?: string;
    order?: string;
  }>;
};

const EMPTY_PAGE = { data: [], total: 0, page: 1, pageSize: 10, totalPages: 1 };

export default async function AlertNotificationsPage({ searchParams }: Props) {
  const params = await searchParams;

  const { userId: clerkId } = await auth();
  if (!clerkId) redirect('/sign-in');
  const clerkUser = await currentUser();
  const primaryEmail = clerkUser?.emailAddresses[0]?.emailAddress;
  if (!primaryEmail) redirect('/sign-in');
  const user = await getUserByEmail(primaryEmail);
  if (!user) redirect('/sign-in');

  const page = Math.max(1, parseInt(params.page ?? '1', 10) || 1);
  const search = params.search ?? '';
  const sortField = (params.sort as AlertNotificationSortField) ?? 'createdAt';
  const sortDir = (params.order === 'asc' ? 'asc' : 'desc') as 'asc' | 'desc';

  const [paginatedData, alertsForSelect] = await Promise.all([
    getAlertNotificationsPaginated(user.id, {
      page,
      pageSize: 10,
      search: search || undefined,
      sortField,
      sortDir,
    }).catch(() => EMPTY_PAGE),
    getAlertsForNotificationSelect(user.id).catch(() => []),
  ]);

  return (
    <PageContainer
      heading="Notificaciones de Alerta"
      breadcrumbs={[
        { label: 'Fleet Manager', href: '/' },
        { label: 'Notificaciones de Alerta' },
      ]}
    >
      <AlertNotificationsClient
        initialData={paginatedData}
        alertsForSelect={alertsForSelect}
      />
    </PageContainer>
  );
}

import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { getUserByEmail } from '@/data/users';
import {
  getAlertsPaginated,
  getAlertTypesForSelect,
  getDevicesForSelect,
  getGeofencesForSelect,
} from '@/data/alerts';
import { PageContainer } from '@/components/layout/PageContainer';
import { AlertsClient } from '@/components/alerts/AlertsClient';
import type { AlertSortField } from '@/data/alerts';

type Props = {
  searchParams: Promise<{
    page?: string;
    search?: string;
    sort?: string;
    order?: string;
  }>;
};

const EMPTY_PAGE = { data: [], total: 0, page: 1, pageSize: 10, totalPages: 1 };

export default async function AlertsPage({ searchParams }: Props) {
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
  const sortField = (params.sort as AlertSortField) ?? 'alertTimestamp';
  const sortDir = (params.order === 'asc' ? 'asc' : 'desc') as 'asc' | 'desc';

  const [paginatedData, alertTypes, devices, geofences] = await Promise.all([
    getAlertsPaginated(user.id, {
      page,
      pageSize: 10,
      search: search || undefined,
      sortField,
      sortDir,
    }).catch(() => EMPTY_PAGE),
    getAlertTypesForSelect().catch(() => []),
    getDevicesForSelect(user.id).catch(() => []),
    getGeofencesForSelect(user.id).catch(() => []),
  ]);

  return (
    <PageContainer
      heading="Alertas"
      breadcrumbs={[
        { label: 'Fleet Manager', href: '/' },
        { label: 'Alertas' },
      ]}
    >
      <AlertsClient
        initialData={paginatedData}
        alertTypes={alertTypes}
        devices={devices}
        geofences={geofences}
      />
    </PageContainer>
  );
}

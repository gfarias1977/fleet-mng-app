import { auth, currentUser } from '@clerk/nextjs/server';
import { getOrCreateUserByEmail } from '@/data/users';
import {
  getGeofenceAlertRulesPaginated,
  getGeofencesForSelect,
  getAlertTypesForSelect,
} from '@/data/geofence-alert-rules';
import { PageContainer } from '@/components/layout/PageContainer';
import { GeofenceAlertRulesClient } from '@/components/geofence-alert-rules/GeofenceAlertRulesClient';
import type { GeofenceAlertRuleSortField } from '@/data/geofence-alert-rules';

type Props = {
  searchParams: Promise<{
    page?: string;
    search?: string;
    sort?: string;
    order?: string;
  }>;
};

const EMPTY_PAGE = { data: [], total: 0, page: 1, pageSize: 10, totalPages: 1 };

export default async function GeofenceAlertRulesPage({ searchParams }: Props) {
  const { userId: clerkId } = await auth();
  const clerkUser = clerkId ? await currentUser() : null;
  const primaryEmail = clerkUser?.emailAddresses[0]?.emailAddress ?? null;
  const fullName =
    [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(' ') ||
    primaryEmail ||
    'User';

  const user = primaryEmail
    ? await getOrCreateUserByEmail({ email: primaryEmail, name: fullName })
    : null;

  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? '1', 10) || 1);
  const search = params.search ?? '';
  const sortField = (params.sort as GeofenceAlertRuleSortField) ?? 'createdAt';
  const sortDir = (params.order === 'desc' ? 'desc' : 'asc') as 'asc' | 'desc';

  const [paginatedData, geofences, alertTypes] = user
    ? await Promise.all([
        getGeofenceAlertRulesPaginated(user.id, {
          page,
          pageSize: 10,
          search: search || undefined,
          sortField,
          sortDir,
        }),
        getGeofencesForSelect(user.id),
        getAlertTypesForSelect(),
      ])
    : [EMPTY_PAGE, [], []];

  return (
    <PageContainer
      heading="Geofence Alert Rules"
      breadcrumbs={[
        { label: 'Fleet Manager', href: '/' },
        { label: 'Geofence Alert Rules' },
      ]}
    >
      <GeofenceAlertRulesClient
        initialData={paginatedData}
        geofences={geofences}
        alertTypes={alertTypes}
      />
    </PageContainer>
  );
}

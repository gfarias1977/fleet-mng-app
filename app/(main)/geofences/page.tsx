import { auth, currentUser } from '@clerk/nextjs/server';
import { getOrCreateUserByEmail } from '@/data/users';
import { getGeofencesPaginated, getGeofenceTypes } from '@/data/geofences';
import { PageContainer } from '@/components/layout/PageContainer';
import { GeofencesClient } from '@/components/geofences/GeofencesClient';
import type { GeofenceSortField } from '@/data/geofences';

type Props = {
  searchParams: Promise<{
    page?: string;
    search?: string;
    sort?: string;
    order?: string;
  }>;
};

const EMPTY_PAGE = { data: [], total: 0, page: 1, pageSize: 10, totalPages: 1 };

export default async function GeofencesPage({ searchParams }: Props) {
  const { userId: clerkId } = await auth();
  const clerkUser = clerkId ? await currentUser() : null;
  const primaryEmail = clerkUser?.emailAddresses[0]?.emailAddress ?? null;
  const fullName =
    [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(' ') ||
    primaryEmail ||
    'User';

  // Auto-provision: si el usuario de Clerk no existe en la DB, lo creamos
  const user = primaryEmail
    ? await getOrCreateUserByEmail({ email: primaryEmail, name: fullName })
    : null;

  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? '1', 10) || 1);
  const search = params.search ?? '';
  const sortField = (params.sort as GeofenceSortField) ?? 'name';
  const sortDir = (params.order === 'desc' ? 'desc' : 'asc') as 'asc' | 'desc';

  const [paginatedData, geofenceTypes] = user
    ? await Promise.all([
        getGeofencesPaginated(user.id, {
          page,
          pageSize: 10,
          search: search || undefined,
          sortField,
          sortDir,
        }),
        getGeofenceTypes(),
      ])
    : [EMPTY_PAGE, []];

  return (
    <PageContainer
      heading="Geofences"
      breadcrumbs={[
        { label: 'Fleet Manager', href: '/' },
        { label: 'Geofences' },
      ]}
    >
      <GeofencesClient
        initialData={paginatedData}
        geofenceTypes={geofenceTypes}
      />
    </PageContainer>
  );
}

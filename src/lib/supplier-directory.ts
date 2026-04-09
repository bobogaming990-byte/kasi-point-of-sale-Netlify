export interface SupplierRecord {
  id: number;
  name: string;
  phone: string;
  email: string;
  address: string;
}

export type SupplierDraft = Partial<Pick<SupplierRecord, "id">> & Omit<SupplierRecord, "id">;

export const seedSupplierRecords: SupplierRecord[] = [
  {
    id: 1,
    name: "SAB",
    phone: "011 881 8111",
    email: "orders@sab.co.za",
    address: "Sandton, Johannesburg",
  },
  {
    id: 2,
    name: "Pioneer Foods",
    phone: "021 807 1100",
    email: "info@pioneerfoods.co.za",
    address: "Paarl, Western Cape",
  },
  {
    id: 3,
    name: "Unilever",
    phone: "011 570 7000",
    email: "info@unilever.co.za",
    address: "La Lucia, Durban",
  },
  {
    id: 4,
    name: "Tiger Brands",
    phone: "011 840 4000",
    email: "info@tigerbrands.com",
    address: "Bryanston, Johannesburg",
  },
  {
    id: 5,
    name: "Oceana Group",
    phone: "021 410 1400",
    email: "info@oceana.co.za",
    address: "Cape Town",
  },
  {
    id: 6,
    name: "PepsiCo",
    phone: "011 884 0600",
    email: "info@pepsico.co.za",
    address: "Sandton, Johannesburg",
  },
  {
    id: 7,
    name: "AVI",
    phone: "011 502 2600",
    email: "info@avi.co.za",
    address: "Bryanston, Johannesburg",
  },
];

export function normalizeSupplierKey(name: string) {
  return name.trim().toLowerCase();
}

function mergeSupplierRecord(existing: SupplierRecord | undefined, supplier: SupplierDraft, fallbackId: number): SupplierRecord {
  return {
    id: existing?.id ?? supplier.id ?? fallbackId,
    name: supplier.name.trim(),
    phone: supplier.phone.trim() || existing?.phone || "",
    email: supplier.email.trim() || existing?.email || "",
    address: supplier.address.trim() || existing?.address || "",
  };
}

export function mergeSupplierRecords(...collections: SupplierDraft[][]): SupplierRecord[] {
  const flattened = collections.flat().filter((supplier): supplier is SupplierDraft => Boolean(supplier?.name?.trim()));
  const maxExistingId = flattened.reduce((highest, supplier) => Math.max(highest, supplier.id ?? 0), 0);
  const supplierMap = new Map<string, SupplierRecord>();
  let nextId = maxExistingId + 1;

  flattened.forEach((supplier) => {
    const key = normalizeSupplierKey(supplier.name);
    if (!key) {
      return;
    }

    const existing = supplierMap.get(key);
    const merged = mergeSupplierRecord(existing, supplier, nextId);
    supplierMap.set(key, merged);

    if (!existing && merged.id >= nextId) {
      nextId = merged.id + 1;
    }
  });

  return Array.from(supplierMap.values()).sort((left, right) => left.name.localeCompare(right.name));
}

export function buildSupplierRecordsFromProducts(products: Array<{ supplier?: SupplierDraft | null }>) {
  return mergeSupplierRecords(
    seedSupplierRecords,
    products
      .map((product) => product.supplier)
      .filter((supplier): supplier is SupplierDraft => Boolean(supplier?.name?.trim())),
  );
}

export function searchSupplierRecords(query: string, suppliers: SupplierDraft[]) {
  const normalizedQuery = normalizeSupplierKey(query);

  if (!normalizedQuery) {
    return [];
  }

  return mergeSupplierRecords(suppliers)
    .filter((supplier) => {
      const haystack = [supplier.name, supplier.phone, supplier.email, supplier.address]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    })
    .slice(0, 8);
}

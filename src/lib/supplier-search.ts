import { store } from "@/lib/store";
import { mergeSupplierRecords, type SupplierRecord } from "@/lib/supplier-directory";

export async function searchSuppliers(query: string, signal?: AbortSignal): Promise<SupplierRecord[]> {
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    return [];
  }

  const localResults = store.searchSuppliers(trimmedQuery);

  try {
    const response = await fetch(`/api/suppliers/search?q=${encodeURIComponent(trimmedQuery)}`, {
      method: "GET",
      signal,
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Supplier search failed with status ${response.status}`);
    }

    const remoteResults = (await response.json()) as SupplierRecord[];
    return mergeSupplierRecords(remoteResults, localResults);
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }

    return localResults;
  }
}

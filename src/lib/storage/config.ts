export const STORAGE_BACKEND =
  process.env.NEXT_PUBLIC_STORAGE_BACKEND ?? "idb";

export type StorageBackend = "idb" | "localstorage";

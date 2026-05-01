/**
 * Anonymous identity management.
 * Re-exports from bootstrap for use within the storage layer.
 * Call getOrCreateAnonId() once at app mount.
 */
export { getOrCreateAnonId, readAnonId } from "@/lib/bootstrap/anon-id";

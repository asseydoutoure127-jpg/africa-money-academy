import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Toutes nos pages sont dynamiques (force-dynamic) : pas de cache incrémental à configurer.
export default defineCloudflareConfig();

# 01: MariaDB-ready model

**What to build:** The EF model carries explicit storage decisions — maximum lengths for indexed strings, decimal precision, date/time precision, boolean mapping and utf8mb4 intent — so the provider switch in the next ticket cannot fail on unbounded text indexes or implicit types. The public site and dashboard behave exactly as they do today on SQLite.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Every indexed string property has an explicit maximum length; composite unique indexes fit InnoDB limits.
- [ ] Long-form content and JSON blobs remain unbounded text.
- [ ] Prices, timestamps and booleans have explicit mappings.
- [ ] The API still boots and seeds against SQLite; existing tests pass unchanged.
- [ ] No public or dashboard behaviour changes.

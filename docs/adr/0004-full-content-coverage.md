# 0004 — Full content coverage in the dashboard

Status: accepted

The dashboard is rebuilt around the rule that every element a visitor can see or read is content, stored in the database and editable in the dashboard, unless it is explicitly frozen by design. "Frozen" is a deliberate, catalogued decision — brand identity lockups, the layout structure owned by code and the seeder, legal/compliance copy, and the en/fa/ps UI chrome dictionaries. We chose this over a curated boundary (only the marketing surface editable) because the curated approach is exactly what produced today's partial coverage, where anything outside the curated set hardcodes itself and waits for a redeploy.
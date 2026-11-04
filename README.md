# Farnam Quotes

Sammlung von Quotes aus den Brain-Food-Ausgaben von fs.blog (**Tiny Thoughts** und
**Insights**) als einzelne Datei: [`quotes.json`](quotes.json).

```json
{ "id": "5c84dba8b769", "quote": "…", "author": "Sam Altman", "source": "https://fs.blog/brain-food/…/" | null, "added": "2026-11-04", "tags": [] }
```

`tags`: Quotes mit mehr als 400 Zeichen (mehrteilige Tiny Thoughts) werden nie gekürzt, sondern
bekommen den Tag `"long"`. Apps können diese Quotes damit per Einstellung ein- oder ausblenden
(Schwelle: `LONG_MIN` in `merge.js`; Tags werden bei jedem Sync neu berechnet).

## Automatik

Jeden Montag 07:00 UTC holt der GitHub-Workflow die neuesten Ausgaben, hängt neue Quotes
an `quotes.json` an (Duplikate werden über `normalize()` erkannt) und committet die Änderung.
Findet der Parser in keiner Ausgabe Quotes (Layout geändert), schlägt der Job fehl und
GitHub schickt eine Mail.

Manuell: *Actions → Farnam Quotes Sync → Run workflow*, Input `issues` = Anzahl der
zu prüfenden Ausgaben (z. B. `12` für einen Backfill).

## Lokal

```bash
npm install
npm test                         # Parser- und Merge-Tests
DRY_RUN=1 ISSUES=3 npm run sync  # zeigt nur an, schreibt nichts
ISSUES=3 npm run sync            # schreibt quotes.json
```

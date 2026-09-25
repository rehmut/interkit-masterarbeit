# Masterarbeit X Interkit

Dieses Repository enthält das Setup und die Projektdaten für die Masterarbeit  
„Digitale Vermittlung im Museum: Potenziale offener Systeme am Beispiel von interkit. Eine Fallstudie zur Anwendung und Weiterentwicklung am Museum für Gegenwartskunst Siegen (AT)“ von Teresa Wendel.

Es basiert auf dem Open-Source-Projekt **Interkit**  
(Original-Repository: https://gitlab.interkit.app/interkit/interkit-experiments).

---

## Abgrenzung: Fremdleistung vs. Eigenleistung

### Fremdleistung (nicht von mir entwickelt)

Die folgenden Bestandteile stammen im Wesentlichen aus dem offiziellen Interkit-Projekt
und sind **nicht** meine Eigenentwicklung:

- das Interkit-Framework selbst (Server, Admin-Interface, Bundler, Docker-Setup)
- Starter-Templates und Beispielprojekte in  
  `repositories/starters/`
- generische Build- und Konfigurationsdateien, soweit sie aus dem Interkit-Repo übernommen wurden

Diese Teile werden im Rahmen der Masterarbeit **nur verwendet**, nicht als eigene Entwicklung beansprucht.
Alle Rechte und das Copyright verbleiben bei den ursprünglichen Autor:innen von Interkit.

### Eigenleistung im Rahmen der Masterarbeit

...

---

## Projektstruktur

...

---

## Voraussetzungen

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) mit laufender Linux-Container-Engine und Docker Compose v2
- Git zum Klonen des Repositories
- Freier Port 80 auf dem eigenen Rechner

Node.js, npm, Meteor und MongoDB müssen auf dem Host nicht installiert werden.

---

## Lokale Entwicklung (Docker)

Diese Anleitung startet das vollständige Interkit-Admin-System mit dem bearbeitbaren
Audioguide-Projekt `audioguide_voegel`. Beim **ersten** Start werden die Daten aus
`repositories/projects/8HQbW3NPRFFdPR5Ni/static/archive` in die lokale MongoDB
übernommen. Projektdateien und Medien sind bereits im Repository enthalten.

```sh
git clone https://github.com/tewendel/interkit-masterarbeit.git
cd interkit-masterarbeit
docker compose up --build -d
```

Der erste Build kann einige Minuten dauern. Danach im Browser
<http://admin.localhost> öffnen und mit **admin** / **reviewer** anmelden.
Das Projekt **audioguide_voegel** sollte in der Projektliste stehen. Die fertige
App ist unter <http://app.localhost/app/8HQbW3NPRFFdPR5Ni/> erreichbar.
Die Adressen funktionieren nur auf dem Rechner, auf dem Docker läuft.
Das ursprüngliche Interkit-Compose-Setup liegt weiterhin in
`docker-compose.upstream.yml`; die Standarddatei startet diese lokale Review-Umgebung.

Optional können vor dem Start in einer lokalen `.env` die Passwörter überschrieben
werden (die Datei wird von Git ignoriert):

```text
INTERKIT_ADMIN_PASSWORD=ein-eigenes-passwort
INTERKIT_BUNDLER_PASSWORD=ein-anderes-langes-passwort
```

Status und Protokolle prüfen:

```sh
docker compose ps
docker compose logs --follow
```

Zum Stoppen `docker compose down` ausführen.
Die Änderungen in MongoDB und hochgeladene Medien bleiben in Docker-Volumes erhalten;
Änderungen an Projektdateien liegen direkt in `repositories/projects/`.
Ein erneuter Start importiert das Archiv **nicht** erneut und überschreibt daher
keine bearbeiteten Daten. Für eine Übergabe der bearbeiteten Inhalte die
Export-Funktion im Admin verwenden. `down --volumes` löscht die lokalen
Datenbank- und Medien-Volumes und sollte nur für einen bewussten Neustart
mit den ursprünglichen Archivdaten verwendet werden.

---

## Lizenzhinweis

Die Lizenzbedingungen von Interkit sind im Original-Repository einzusehen:
[https://gitlab.interkit.app/interkit/interkit-experiments](https://gitlab.interkit.app/interkit/interkit-experiments)


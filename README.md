# Mijn Muziekcollectie

Een zelfstandige, mobielvriendelijke webapp om je cd- en lp-collectie veilig vast te leggen.

## Installatie op hosting

1. Upload alle bestanden en stel de document-root van je domein in op de map `public`.
2. Zorg dat PHP 8.1+ met de extensies `pdo_sqlite`, `sqlite3`, `fileinfo` en `curl` beschikbaar is.
3. Geef PHP schrijfrechten op de map `storage` (deze staat bewust buiten `public`).
4. Open de site via **HTTPS**. De eerste bezoeker ziet een eenmalig scherm om het beheerdersaccount aan te maken.

Gebruik geen standaardwachtwoord: de app slaat uitsluitend een sterke `password_hash` op. Maak regelmatig een back-up van `storage/music.sqlite` én `storage/uploads`.

## Barcodegegevens

Bij het invullen kan de app gratis zoeken in [MusicBrainz](https://musicbrainz.org/doc/MusicBrainz_API): titel, artiest, medium en tracklijst worden als voorstel ingevuld. Controleer die gegevens altijd; persingen kunnen verschillen. Er worden geen MusicBrainz-gegevens lokaal overschreven zonder dat je op Opslaan klikt.

Het mediumformaat uit de gevonden uitgave stelt automatisch **CD** of **LP** in. Bij een onbekend of afwijkend formaat blijft de bestaande keuze staan, zodat je die zelf kunt bepalen.

Wanneer je geen eigen voorkantfoto toevoegt, wordt in het collectieoverzicht automatisch de beschikbare hoes van MusicBrainz' Cover Art Archive getoond. Maak je een foto in het barcodeveld, dan leest de browser de barcode uit die foto en start de zoekopdracht automatisch.

Als de strepen in de barcodefoto niet goed herkenbaar zijn, probeert de app ook de gedrukte cijfers onder de barcode uit te lezen. Controleer het gevonden nummer voordat je opslaat.

## Veiligheid

- Login met veilige, `HttpOnly`/`SameSite` sessiecookie en sessie-id-rotatie.
- Wachtwoorden met Argon2id (of bcrypt als dat niet beschikbaar is).
- CSRF-tokens op alle muterende formulieren.
- Foto's worden gevalideerd, krijgen willekeurige bestandsnamen en zijn alleen na inloggen via PHP te bekijken.
- De `storage`-map is niet publiek bereikbaar wanneer `public` de document-root is.

Voor productie: forceer HTTPS bij je host, gebruik een lange unieke beheerderswachtzin en maak periodiek backups.

## Updates

De knop **Updates** vergelijkt de lokale versie in `version.json` met de publieke versie op GitHub. Verhoog `version` wanneer je een nieuwe versie naar de `main`-branch pusht. De app installeert nooit zelfstandig code vanaf internet: maak eerst een back-up en upload de update bewust via je hosting.

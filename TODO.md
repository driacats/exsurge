# TODO

- [ ] Usare Caeciliae come font principale per tutto il rendering dei neumi
      (oggi i neumi sono disegnati con path SVG grezzi in `src/Exsurge.Glyphs.ts`;
      il font Caeciliae è già presente in `assets/fonts/caeciliae-0.9.9/` ma non
      è collegato a nessuna logica di rendering. Passare a Caeciliae richiede una
      nuova mappatura completa dei glifi (quale carattere/glifo del font
      corrisponde a quale neuma/forma), non solo sostituire il file font — da
      pianificare separatamente in una sessione dedicata)

- [ ] Vero glifo per l'accidente diesis (`AccidentalType.Sharp`): non esiste
      ancora un glifo "Sharp" nel set di glifi (`src/Exsurge.Glyphs.ts`).
      Attualmente, per evitare un crash quando gabc richiede un diesis,
      `Accidental.createGlyphVisualizer` usa il glifo "Natural" come
      fallback visivo (vedi commento in `src/Exsurge.Chant.Signs.ts`) — è
      visivamente scorretto, serve disegnare/importare un vero glifo diesis.

- [ ] `Accidental.applyToPitch` (`src/Exsurge.Chant.Signs.ts`) è un no-op
      auto-documentato ("fixme: this is broken since we changed to staff
      positions") ereditato dal codice originale — mai stato completato.

- [ ] Le braces (parentesi graffe/tonde sopra/sotto i neumi) che iniziano su
      una riga di canto e continuano sulla successiva non sono gestite
      (`src/Exsurge.Chant.ChantLine.ts`, cercare "spans two chant lines") —
      il rendering si interrompe silenziosamente alla fine della riga.

- [ ] Rivedere in modo più approfondito la copertura dei test: attualmente
      c'è un solo smoke test end-to-end (parsing + layout + SVG) oltre ai
      test di unità su Core/Latin. Quasi tutta la logica di layout/disegno
      (`Exsurge.Drawing.ts`, `Exsurge.Chant.ChantLine.ts`,
      `Exsurge.Chant.Neumes.ts`) non ha test dedicati.

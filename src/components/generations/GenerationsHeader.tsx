/**
 * Nagłówek widoku z tytułem i opisem.
 * Prosty komponent prezentacyjny.
 */
export function GenerationsHeader() {
  return (
    <header className="mb-8">
      <h1 className="text-3xl font-bold tracking-tight">Historia generacji</h1>
      <p className="text-muted-foreground mt-2">
        Przeglądaj historię swoich generacji fiszek i śledź skuteczność AI.
      </p>
    </header>
  );
}

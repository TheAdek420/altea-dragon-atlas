# Atlas Altei V13 — kalibracja wizualizacji

## Zasady

- **Długość**: oryginalne ilustracje smoków są wyświetlane bez rozciągania. Każdy smok ma na planszy dokładną **długość** z `data.js`. Wysokość jest podawana tekstowo, ale graficzne proporcje ilustracji mogą nie odpowiadać zapisanej wysokości.
- **Wysokość**: wybieramy **jednego smoka** i porównujemy jego wysokość z punktami odniesienia. Zachowujemy proporcje ilustracji, a wysokość graficzna w tym trybie odpowiada `data.js`. Długość obrazu nie jest w tym trybie traktowana jako skalibrowana.
- **Rozpiętość skrzydeł**: szerokość uniwersalnego schematu odpowiada dokładnie rozpiętości z `data.js`. Nieskrzydlate stworzenia nie biorą udziału w tym trybie.
- **Reference items**: są kadrowane do zawartości. Stojące budowle można obrócić do poziomu, dzięki czemu np. Burj Khalifa zajmuje poziomo 828 m; pionowo zajmuje 828 m wysokości. Obrót nie deformuje obrazu.
- **Everest**: podane 8848,86 m oznacza wysokość nad poziomem morza. Graficzne porównanie traktuje ten pomiar jako orientacyjną wysokość referencyjną i wyświetla ostrzeżenie — nie jest to różnica między szczytem a podnóżem.
- **Małe obiekty**: w prawdziwej wspólnej skali mogą być niemal niewidoczne obok wielkich smoków. Funkcja „Zbliż na wybrany” zmienia tylko kamerę, nigdy rozmiar obiektów.

## Dlaczego nie można skalibrować długości i wysokości jednocześnie bez deformacji?

Jeżeli oryginalna ilustracja ma inne proporcje boków niż ustalone wymiary smoka, zachowanie wyglądu bez rozciągania oznacza konieczność wyboru jednej osi, według której obraz jest skalowany. Dokładne odwzorowanie obu osi równocześnie wymaga przygotowania nowej ilustracji o docelowych proporcjach. V13 świadomie unika sztucznego rozciągania.

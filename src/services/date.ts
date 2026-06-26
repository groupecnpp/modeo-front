export function formatRelativeDate(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const sec = Math.floor(diffMs / 1000);

    if (sec < 60) return "À l'instant";
    const min = Math.floor(sec / 60);
    if (min < 60) return `Il y a ${min} minute${min > 1 ? "s" : ""}`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `Il y a ${hr} heure${hr > 1 ? "s" : ""}`;
    const day = Math.floor(hr / 24);
    if (day < 7) return `Il y a ${day} jour${day > 1 ? "s" : ""}`;
    return date.toLocaleDateString("fr-FR");
}

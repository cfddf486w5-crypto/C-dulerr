import { CARRIER_PREFIXES, validateContainerCheckDigit } from './utils';

export function extractContainersFromRawText(text: string) {
  const lines = String(text || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const results = [];
  const containerRegex = /\b([A-Z]{4}[0-9]{7})\b/gi;
  const fallbackRegex = /\b([A-Z]{4}[0-9]{6,7})\b/gi;

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex];
    let match = containerRegex.exec(line) || fallbackRegex.exec(line);
    
    if (match) {
      const containerNumber = match[1].toUpperCase();
      const prefix = containerNumber.slice(0, 4);
      const carrier = CARRIER_PREFIXES[prefix] || 'Inconnu';
      const isValidCheckDigit = validateContainerCheckDigit(containerNumber);

      let lfd = '';
      const explicitLfd = line.match(/\blfd\b\D*([0-9]{1,2}\/[0-9]{1,2})/i) || line.match(/last\s*free\s*day\D*([0-9]{1,2}\/[0-9]{1,2})/i);
      if (explicitLfd) {
        const [m, d] = explicitLfd[1].split('/').map(n => String(Number(n)).padStart(2, '0'));
        const currentYear = new Date().getFullYear();
        lfd = `${currentYear}-${m}-${d}`;
      } else {
        const dateMatch = line.match(/(\d{4}-\d{2}-\d{2})/);
        if (dateMatch) lfd = dateMatch[1];
      }

      let suggestedSite = 'Montréal';
      if (/québec|quebec/i.test(line)) suggestedSite = 'Québec';
      else if (/montréal|montreal|mtl/i.test(line)) suggestedSite = 'Montréal';

      results.push({
        id: `extracted-${lineIndex}-${Date.now()}`,
        containerNumber,
        carrier,
        lfd,
        suggestedSite,
        validISO: isValidCheckDigit,
        rawLine: line
      });
    }
  }

  return results;
}

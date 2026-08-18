import { ContainerEntry, Proof, Tenant } from '../types';
import { detectCarrier } from './utils';

export function generateReceiptPDF(proof: Proof, entry: ContainerEntry, tenant: Tenant, language: string = 'fr') {
  const carrier = detectCarrier(proof.containerNumber);
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert("Veuillez autoriser les fenêtres pop-up pour imprimer le bon.");
    return;
  }

  const isEn = language === 'en';
  const title = isEn ? 'RECEIVING & UNLOADING VOUCHER' : 'BON DE RÉCEPTION & DÉPOTAGE';
  const subtitle = isEn ? 'Official receiving inspection and traceability document' : 'Document officiel de contrôle et traçabilité logistique';

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Bon de Dépotage - ${proof.containerNumber}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 2.5rem; color: #0f172a; line-height: 1.6; }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #0284c7; padding-bottom: 1.2rem; margin-bottom: 1.5rem; }
        h1 { margin: 0; font-size: 1.6rem; color: #0284c7; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.2rem; margin-bottom: 1.5rem; }
        .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 1.2rem; }
        .badge { display: inline-block; background: #0284c7; color: #fff; padding: 0.2rem 0.6rem; border-radius: 4px; font-weight: bold; }
        .photo { max-width: 100%; max-height: 280px; border-radius: 8px; margin-top: 0.8rem; border: 1px solid #cbd5e1; }
        .signature { max-width: 220px; border-bottom: 1px solid #94a3b8; margin-top: 0.5rem; }
        @media print { body { padding: 0; } }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <h1>${title}</h1>
          <p style="margin: 0.2rem 0 0 0; color: #64748b;">${subtitle}</p>
        </div>
        <div style="text-align: right;">
          <span class="badge">${proof.warehouse}</span>
          <p style="margin: 0.3rem 0 0 0; font-weight: bold;">Date : ${proof.receivedDate} à ${proof.receivedTime}</p>
        </div>
      </div>

      <div class="grid">
        <div class="card">
          <h3 style="margin-top: 0; color: #0284c7;">Informations Conteneur</h3>
          <p><strong>Numéro :</strong> ${proof.containerNumber}</p>
          <p><strong>Armateur / Ligne Maritime :</strong> ${carrier}</p>
          <p><strong>Last Free Day (LFD) :</strong> ${entry?.lfd || 'Non renseigné'}</p>
          <p><strong>Statut de Livraison :</strong> <span style="color: #16a34a; font-weight: bold;">LIVRÉ / ARCHIVÉ</span></p>
        </div>
        <div class="card">
          <h3 style="margin-top: 0; color: #0284c7;">Contrôle & Déchargement</h3>
          <p><strong>Site de réception :</strong> ${proof.warehouse}</p>
          <p><strong>Heure de pointage :</strong> ${proof.receivedTime}</p>
          <p><strong>Notes de dépotage :</strong> ${proof.note || 'Aucune anomalie signalée'}</p>
        </div>
      </div>

      ${proof.photoData ? `
        <div class="card" style="margin-bottom: 1.5rem;">
          <h3 style="margin-top: 0; color: #0284c7;">Preuve Photographique</h3>
          <img src="${proof.photoData}" class="photo" alt="Preuve de réception" />
        </div>
      ` : ''}

      <div class="grid">
        <div class="card">
          <h3 style="margin-top: 0;">Visa Transporteur</h3>
          <p>Marchandise déchargée conforme au connaissement.</p>
          <div style="height: 50px;"></div>
        </div>
        <div class="card">
          <h3 style="margin-top: 0;">Signature Récepteur / Cariste</h3>
          ${proof.signatureData ? `<img src="${proof.signatureData}" class="signature" />` : '<div style="height: 50px;"></div>'}
          <p><small>Horodaté électroniquement le ${proof.receivedDate}</small></p>
        </div>
      </div>
    </body>
    </html>
  `);
  printWindow.document.close();
  setTimeout(() => { printWindow.print(); }, 400);
}

export function generateSchedulePDF(entries: ContainerEntry[], tenant: Tenant, language: string = 'fr') {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert("Veuillez autoriser les fenêtres pop-up pour générer le rapport.");
    return;
  }

  const isEn = language === 'en';
  const title = isEn ? 'CONTAINER SCHEDULE REPORT' : 'RAPPORT DE CÉDULE DES CONTENEURS';
  const subtitle = isEn ? 'Generated on' : 'Généré le';

  const rowsHtml = entries.map(e => `
    <tr>
      <td><strong>${e.containerNumber}</strong></td>
      <td>${e.carrier}</td>
      <td>${e.warehouse} ${e.doorName ? `(${e.doorName})` : ''}</td>
      <td>${e.date}</td>
      <td>${e.startTime}</td>
      <td>${e.lfd || '-'}</td>
      <td>
        <span class="badge ${e.archivedAt ? 'badge-archived' : 'badge-scheduled'}">
          ${e.archivedAt ? (isEn ? 'Archived' : 'Archivé') : (isEn ? 'Scheduled' : 'Cédulé')}
        </span>
      </td>
    </tr>
  `).join('');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Schedule Report</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 2rem; color: #0f172a; line-height: 1.5; }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #0ea5e9; padding-bottom: 1rem; margin-bottom: 2rem; }
        h1 { margin: 0; font-size: 1.5rem; color: #0ea5e9; text-transform: uppercase; letter-spacing: 0.05em; }
        table { width: 100%; border-collapse: collapse; margin-top: 1rem; font-size: 0.85rem; }
        th, td { padding: 0.75rem; text-align: left; border-bottom: 1px solid #e2e8f0; }
        th { background-color: #f8fafc; font-weight: 600; color: #475569; text-transform: uppercase; font-size: 0.75rem; letter-spacing: 0.05em; }
        tr:nth-child(even) { background-color: #f8fafc; }
        .badge { padding: 0.2rem 0.5rem; border-radius: 999px; font-size: 0.7rem; font-weight: bold; text-transform: uppercase; }
        .badge-scheduled { background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; }
        .badge-archived { background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; }
        @media print { 
          body { padding: 0; } 
          @page { size: landscape; margin: 1cm; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <h1>${title}</h1>
          <p style="margin: 0.2rem 0 0 0; color: #64748b; font-size: 0.85rem;">
            <strong>${tenant.name}</strong><br>
            ${subtitle} ${new Date().toLocaleDateString(isEn ? 'en-US' : 'fr-CA', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>${isEn ? 'Container' : 'Conteneur'}</th>
            <th>${isEn ? 'Carrier' : 'Ligne'}</th>
            <th>${isEn ? 'Site & Dock' : 'Site & Quai'}</th>
            <th>Date</th>
            <th>${isEn ? 'Time' : 'Heure'}</th>
            <th>LFD</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml || `<tr><td colspan="7" style="text-align: center; padding: 2rem; color: #64748b;">${isEn ? 'No containers scheduled.' : 'Aucun conteneur cédulé.'}</td></tr>`}
        </tbody>
      </table>
      
      <script>
        window.onload = () => {
          setTimeout(() => {
            window.print();
          }, 500);
        };
      </script>
    </body>
    </html>
  `);
  printWindow.document.close();
}

export function generateOsdPDF(proof: Proof, entry: ContainerEntry, tenant: Tenant, language: string = 'fr') {
  if (!proof.osd) return;

  const carrier = detectCarrier(proof.containerNumber);
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const isEn = language === 'en';
  const title = isEn ? "FREIGHT CLAIM & OS&D REPORT" : "RAPPORT D'AVARIE & RÉCLAMATION OS&D";
  
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Réclamation OS&D - ${proof.containerNumber}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 2.5rem; color: #0f172a; line-height: 1.6; }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #dc2626; padding-bottom: 1.2rem; margin-bottom: 1.5rem; }
        h1 { margin: 0; font-size: 1.6rem; color: #dc2626; }
        .alert-box { background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 1rem; margin-bottom: 1.5rem; color: #991b1b; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.2rem; margin-bottom: 1.5rem; }
        .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 1.2rem; }
        .photo { max-width: 100%; max-height: 280px; border-radius: 8px; margin-top: 0.8rem; border: 1px solid #cbd5e1; }
        .signature { max-width: 220px; border-bottom: 1px solid #94a3b8; margin-top: 0.5rem; }
        .badge-danger { background: #dc2626; color: #fff; padding: 0.2rem 0.6rem; border-radius: 4px; font-weight: bold; }
        @media print { body { padding: 0; } }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <h1>${title}</h1>
          <p style="margin: 0.2rem 0 0 0; color: #64748b;">Over, Short & Damaged Freight Claim Form</p>
        </div>
        <div style="text-align: right;">
          <span class="badge-danger">LITIGE CONSTATÉ</span>
          <p style="margin: 0.3rem 0 0 0; font-weight: bold;">Date constat : ${proof.receivedDate} à ${proof.receivedTime}</p>
        </div>
      </div>

      <div class="alert-box">
        <strong>⚠️ RÉSERVES LÉGALES FORMULÉES À LA RÉCEPTION :</strong>
        Une anomalie a été constatée lors de l'ouverture du conteneur. Ce document fait foi auprès des assurances maritimes et du transporteur.
      </div>

      <div class="grid">
        <div class="card">
          <h3 style="margin-top: 0; color: #dc2626;">Détails de l'Anomalie Constatée</h3>
          <p><strong>Produit / Code :</strong> ${proof.osd.product || 'Non spécifié'}</p>
          <p><strong>Quantité affectée :</strong> ${proof.osd.quantity || 'Non spécifiée'}</p>
          <p><strong>Causes / Nature :</strong> ${proof.osd.damageTypes?.length > 0 ? proof.osd.damageTypes.join(', ') : 'Non spécifié'}</p>
          <p><strong>Détails :</strong> ${proof.osd.details || 'Aucun détail'}</p>
        </div>

        <div class="card">
          <h3 style="margin-top: 0; color: #0284c7;">Informations Conteneur & Quai</h3>
          <p><strong>Numéro de Conteneur :</strong> ${proof.containerNumber}</p>
          <p><strong>Ligne Maritime :</strong> ${carrier}</p>
          <p><strong>Site de déchargement :</strong> ${proof.warehouse}</p>
          <p><strong>Remarques de l'agent :</strong> ${proof.note || 'Aucune note supplémentaire'}</p>
        </div>
      </div>

      ${proof.photoData ? `
        <div class="card" style="margin-bottom: 1.5rem;">
          <h3 style="margin-top: 0; color: #dc2626;">Preuve Photographique du Dommage / Scellé</h3>
          <img src="${proof.photoData}" class="photo" alt="Preuve d'anomalie" />
        </div>
      ` : ''}

      <div class="grid">
        <div class="card">
          <h3 style="margin-top: 0;">Visa & Signature du Chauffeur</h3>
          <p>Le soussigné reconnaît avoir été informé des réserves ci-dessus.</p>
          <div style="height: 50px;"></div>
        </div>
        <div class="card">
          <h3 style="margin-top: 0;">Signature Récepteur / Superviseur</h3>
          ${proof.signatureData ? `<img src="${proof.signatureData}" class="signature" />` : '<div style="height: 50px;"></div>'}
          <p><small>Horodaté électroniquement le ${proof.receivedDate}</small></p>
        </div>
      </div>
    </body>
    </html>
  `);
  printWindow.document.close();
  setTimeout(() => { printWindow.print(); }, 400);
}

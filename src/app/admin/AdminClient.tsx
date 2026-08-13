"use client";

import { useEffect, useState } from "react";

type Employee = { id: number; lastName: string; firstName: string; active: boolean };
type NewCode = { lastName: string; firstName: string; code: string };

export default function AdminClient() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [lines, setLines] = useState("");
  const [importing, setImporting] = useState(false);
  const [newCodes, setNewCodes] = useState<NewCode[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [resetCode, setResetCode] = useState<{ id: number; code: string } | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/employees");
    if (res.ok) {
      const data = await res.json();
      setEmployees(data.employees);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function importLines(e: React.FormEvent) {
    e.preventDefault();
    if (!lines.trim()) return;
    setImporting(true);
    setError(null);
    const res = await fetch("/api/admin/employees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lines }),
    });
    const data = await res.json();
    setImporting(false);
    if (!res.ok) {
      setError(data.error ?? "Échec de l'import.");
      return;
    }
    setNewCodes(data.created);
    setLines("");
    load();
  }

  async function toggleActive(emp: Employee) {
    await fetch(`/api/admin/employees/${emp.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !emp.active }),
    });
    load();
  }

  async function reset(emp: Employee) {
    const res = await fetch(`/api/admin/employees/${emp.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resetCode: true }),
    });
    const data = await res.json();
    if (res.ok) {
      setResetCode({ id: emp.id, code: data.code });
    }
  }

  async function remove(emp: Employee) {
    if (!confirm(`Supprimer ${emp.firstName} ${emp.lastName} et tout son historique d'inscriptions ?`)) return;
    await fetch(`/api/admin/employees/${emp.id}`, { method: "DELETE" });
    load();
  }

  function downloadCsv() {
    const header = "Nom;Prenom;Code\n";
    const body = newCodes.map((c) => `${c.lastName};${c.firstName};${c.code}`).join("\n");
    const blob = new Blob([header + body], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "codes-cantine.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <div className="card">
        <h2>Importer des employés</h2>
        <p className="subtitle">
          Une ligne par personne, au format <code>Nom;Prénom</code> (aussi accepté : tabulation ou virgule). Un
          code personnel à 4 chiffres est généré automatiquement pour chacun.
        </p>
        <form onSubmit={importLines}>
          <div className="field">
            <textarea
              className="input"
              placeholder={"Dupont;Marie\nMartin;Jean\n..."}
              value={lines}
              onChange={(e) => setLines(e.target.value)}
            />
          </div>
          {error && <div className="error-text">{error}</div>}
          <button className="btn btn-primary" type="submit" disabled={importing}>
            {importing ? "Import..." : "Importer"}
          </button>
        </form>

        {newCodes.length > 0 && (
          <div className="code-list">
            <strong>{newCodes.length} compte(s) créé(s)</strong> — notez ces codes, ils ne seront plus jamais
            affichés en clair.
            <table style={{ marginTop: 12 }}>
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Prénom</th>
                  <th>Code</th>
                </tr>
              </thead>
              <tbody>
                {newCodes.map((c, i) => (
                  <tr key={i}>
                    <td>{c.lastName}</td>
                    <td>{c.firstName}</td>
                    <td>
                      <strong>{c.code}</strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button className="btn" style={{ marginTop: 12 }} onClick={downloadCsv}>
              Télécharger en CSV
            </button>
          </div>
        )}
      </div>

      <div className="card">
        <h2>Employés ({employees.length})</h2>
        {loading ? (
          <p className="muted">Chargement...</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Nom</th>
                <th>Prénom</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => (
                <tr key={emp.id}>
                  <td>{emp.lastName}</td>
                  <td>{emp.firstName}</td>
                  <td>
                    <span className={`badge ${emp.active ? "badge-good" : "badge-bad"}`}>
                      {emp.active ? "Actif" : "Inactif"}
                    </span>
                  </td>
                  <td>
                    <div className="row-actions">
                      <button className="btn" onClick={() => toggleActive(emp)}>
                        {emp.active ? "Désactiver" : "Activer"}
                      </button>
                      <button className="btn" onClick={() => reset(emp)}>
                        Réinitialiser code
                      </button>
                      <button className="btn btn-danger" onClick={() => remove(emp)}>
                        Supprimer
                      </button>
                    </div>
                    {resetCode?.id === emp.id && (
                      <div className="helper">
                        Nouveau code : <strong>{resetCode.code}</strong>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

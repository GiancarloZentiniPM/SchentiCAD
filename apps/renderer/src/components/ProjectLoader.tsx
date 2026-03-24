import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useProjectStore } from "../stores/projectStore";
import { useUIStore } from "../stores/uiStore";
import { dbSync } from "../services/dbSync";
import { App } from "../App";

export function ProjectLoader() {
  const { id } = useParams<{ id: string }>();
  const setProjectData = useProjectStore((s) => s.setProjectData);
  const setActivePageId = useUIStore((s) => s.setActivePageId);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    dbSync
      .loadProject(id)
      .then(({ project, pages, elements, wires }) => {
        setProjectData({
          id: project.id,
          name: project.name,
          pages,
          elements,
          wires,
        });
        if (pages.length > 0) {
          setActivePageId(pages[0].id);
        }
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message ?? "Projekt konnte nicht geladen werden");
        setLoading(false);
      });
  }, [id, setProjectData, setActivePageId]);

  if (loading) {
    return (
      <div className="project-loader">
        <div className="loader-spinner" />
        <p>Lade Projekt…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="project-loader">
        <p className="error-message">Fehler: {error}</p>
        <a href="/projects">← Zurück zur Projektliste</a>
      </div>
    );
  }

  return <App />;
}

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useProjects, useCreateProject, useDeleteProject } from "../api/hooks";

export function ProjectPicker() {
  const { data: projects, isLoading, error } = useProjects();
  const createProject = useCreateProject();
  const deleteProject = useDeleteProject();
  const navigate = useNavigate();

  const [showNewForm, setShowNewForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCompany, setNewCompany] = useState("");
  const [newCreator, setNewCreator] = useState("");

  const handleCreate = () => {
    if (!newName.trim()) return;
    createProject.mutate(
      { name: newName.trim(), company: newCompany.trim(), creator: newCreator.trim() },
      {
        onSuccess: (project) => {
          setShowNewForm(false);
          setNewName("");
          setNewCompany("");
          setNewCreator("");
          navigate(`/project/${project.id}`);
        },
      },
    );
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Projekt "${name}" wirklich löschen?`)) {
      deleteProject.mutate(id);
    }
  };

  return (
    <div className="project-picker">
      <div className="project-picker-header">
        <h1>SchentiCAD</h1>
        <p className="subtitle">2D Elektro-CAD System</p>
      </div>

      <div className="project-picker-content">
        <div className="project-picker-actions">
          <button className="btn-primary" onClick={() => setShowNewForm(true)}>
            + Neues Projekt
          </button>
          <button className="btn-secondary" onClick={() => navigate("/editor")}>
            Offline-Editor (ohne DB)
          </button>
        </div>

        {showNewForm && (
          <div className="new-project-form">
            <h3>Neues Projekt</h3>
            <input
              type="text"
              placeholder="Projektname *"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
            <input
              type="text"
              placeholder="Firma"
              value={newCompany}
              onChange={(e) => setNewCompany(e.target.value)}
            />
            <input
              type="text"
              placeholder="Ersteller"
              value={newCreator}
              onChange={(e) => setNewCreator(e.target.value)}
            />
            <div className="form-buttons">
              <button className="btn-primary" onClick={handleCreate} disabled={!newName.trim()}>
                Erstellen
              </button>
              <button className="btn-secondary" onClick={() => setShowNewForm(false)}>
                Abbrechen
              </button>
            </div>
          </div>
        )}

        <div className="project-list">
          <h2>Vorhandene Projekte</h2>
          {isLoading && <p className="loading">Lade Projekte…</p>}
          {error && (
            <p className="error-message">
              Backend nicht erreichbar. <br />
              <button className="btn-secondary" onClick={() => navigate("/editor")}>
                Im Offline-Modus arbeiten
              </button>
            </p>
          )}
          {projects && projects.length === 0 && (
            <p className="empty">Keine Projekte vorhanden. Erstelle dein erstes Projekt!</p>
          )}
          {projects &&
            projects.map((project: any) => (
              <div
                key={project.id}
                className="project-card"
                onClick={() => navigate(`/project/${project.id}`)}
              >
                <div className="project-card-info">
                  <h3>{project.name}</h3>
                  <span className="project-meta">
                    {project.company && `${project.company} · `}
                    {project.pages?.length ?? 0} Seiten · Rev. {project.revision}
                  </span>
                  <span className="project-date">
                    {new Date(project.updatedAt).toLocaleDateString("de-DE")}
                  </span>
                </div>
                <button
                  className="btn-danger-small"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(project.id, project.name);
                  }}
                  title="Löschen"
                >
                  ✕
                </button>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

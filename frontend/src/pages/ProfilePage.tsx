import { useEffect, useState } from "react";
import type { Profile, ProfileUpdate } from "../api/profile";
import { getProfile, updateProfile } from "../api/profile";
import type { WorkExperience, WorkExperienceCreate } from "../api/work_experiences";
import {
  createWorkExperience,
  deleteWorkExperience,
  listWorkExperiences,
  updateWorkExperience,
} from "../api/work_experiences";
import type { Education, EducationCreate } from "../api/educations";
import {
  createEducation,
  deleteEducation,
  listEducations,
  updateEducation,
} from "../api/educations";
import Navbar from "../components/Navbar";

// ─────────────────────────────────────────────────────────────
// Small helpers
// ─────────────────────────────────────────────────────────────

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Work experience row (inline edit on click)
// ─────────────────────────────────────────────────────────────

function WorkExpRow({
  exp,
  onUpdate,
  onDelete,
}: {
  exp: WorkExperience;
  onUpdate: (id: string, data: Partial<WorkExperienceCreate>) => void;
  onDelete: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    company: exp.company,
    title: exp.title,
    start_date: exp.start_date ?? "",
    end_date: exp.end_date ?? "",
    is_current: exp.is_current,
    description: exp.description ?? "",
  });

  const save = () => {
    onUpdate(exp.id, {
      ...form,
      end_date: form.is_current ? undefined : form.end_date || undefined,
    });
    setEditing(false);
  };

  if (!editing) {
    return (
      <div className="flex items-start justify-between gap-2 py-3 border-b border-gray-100 last:border-0">
        <div>
          <p className="text-sm font-medium text-gray-900">{exp.title}</p>
          <p className="text-xs text-gray-500">
            {exp.company} · {exp.start_date ?? "—"} – {exp.is_current ? "Present" : (exp.end_date ?? "—")}
          </p>
          {exp.description && (
            <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{exp.description}</p>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          <button onClick={() => setEditing(true)} className="text-xs text-blue-600 hover:text-blue-800">
            Edit
          </button>
          <button onClick={() => onDelete(exp.id)} className="text-xs text-red-500 hover:text-red-700">
            Delete
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="py-3 border-b border-gray-100 last:border-0 space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <Field label="Company" value={form.company} onChange={(v) => setForm({ ...form, company: v })} />
        <Field label="Title" value={form.title} onChange={(v) => setForm({ ...form, title: v })} />
        <Field label="Start (YYYY-MM)" value={form.start_date} onChange={(v) => setForm({ ...form, start_date: v })} />
        {!form.is_current && (
          <Field label="End (YYYY-MM)" value={form.end_date} onChange={(v) => setForm({ ...form, end_date: v })} />
        )}
      </div>
      <label className="flex items-center gap-2 text-xs text-gray-600">
        <input
          type="checkbox"
          checked={form.is_current}
          onChange={(e) => setForm({ ...form, is_current: e.target.checked })}
        />
        Currently working here
      </label>
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
        <textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          rows={3}
          className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div className="flex gap-2">
        <button onClick={save} className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700">
          Save
        </button>
        <button onClick={() => setEditing(false)} className="text-xs text-gray-500 hover:text-gray-700">
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Education row (inline edit on click)
// ─────────────────────────────────────────────────────────────

function EducationRow({
  edu,
  onUpdate,
  onDelete,
}: {
  edu: Education;
  onUpdate: (id: string, data: Partial<EducationCreate>) => void;
  onDelete: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    school: edu.school,
    degree: edu.degree ?? "",
    field_of_study: edu.field_of_study ?? "",
    start_date: edu.start_date ?? "",
    end_date: edu.end_date ?? "",
    gpa: edu.gpa ?? "",
  });

  const save = () => {
    onUpdate(edu.id, form);
    setEditing(false);
  };

  if (!editing) {
    return (
      <div className="flex items-start justify-between gap-2 py-3 border-b border-gray-100 last:border-0">
        <div>
          <p className="text-sm font-medium text-gray-900">{edu.school}</p>
          <p className="text-xs text-gray-500">
            {[edu.degree, edu.field_of_study].filter(Boolean).join(" · ")}
            {edu.start_date && ` · ${edu.start_date} – ${edu.end_date ?? "Present"}`}
          </p>
          {edu.gpa && <p className="text-xs text-gray-400">GPA: {edu.gpa}</p>}
        </div>
        <div className="flex gap-2 shrink-0">
          <button onClick={() => setEditing(true)} className="text-xs text-blue-600 hover:text-blue-800">
            Edit
          </button>
          <button onClick={() => onDelete(edu.id)} className="text-xs text-red-500 hover:text-red-700">
            Delete
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="py-3 border-b border-gray-100 last:border-0 space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <Field label="School" value={form.school} onChange={(v) => setForm({ ...form, school: v })} />
        <Field label="Degree" value={form.degree} onChange={(v) => setForm({ ...form, degree: v })} placeholder="e.g. Bachelor" />
        <Field label="Field of Study" value={form.field_of_study} onChange={(v) => setForm({ ...form, field_of_study: v })} />
        <Field label="GPA" value={form.gpa} onChange={(v) => setForm({ ...form, gpa: v })} />
        <Field label="Start (YYYY-MM)" value={form.start_date} onChange={(v) => setForm({ ...form, start_date: v })} />
        <Field label="End (YYYY-MM)" value={form.end_date} onChange={(v) => setForm({ ...form, end_date: v })} />
      </div>
      <div className="flex gap-2">
        <button onClick={save} className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700">
          Save
        </button>
        <button onClick={() => setEditing(false)} className="text-xs text-gray-500 hover:text-gray-700">
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Add-work-experience form (collapsed by default)
// ─────────────────────────────────────────────────────────────

function AddWorkExpForm({ onAdd }: { onAdd: (data: WorkExperienceCreate) => void }) {
  const [open, setOpen] = useState(false);
  const blank = { company: "", title: "", start_date: "", end_date: "", is_current: false, description: "" };
  const [form, setForm] = useState(blank);

  const submit = () => {
    if (!form.company || !form.title) return;
    onAdd({ ...form, end_date: form.is_current ? undefined : form.end_date || undefined });
    setForm(blank);
    setOpen(false);
  };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-xs text-blue-600 hover:text-blue-800 font-medium mt-1">
        + Add Experience
      </button>
    );
  }

  return (
    <div className="mt-3 space-y-2 border-t border-gray-100 pt-3">
      <div className="grid grid-cols-2 gap-2">
        <Field label="Company *" value={form.company} onChange={(v) => setForm({ ...form, company: v })} />
        <Field label="Title *" value={form.title} onChange={(v) => setForm({ ...form, title: v })} />
        <Field label="Start (YYYY-MM)" value={form.start_date} onChange={(v) => setForm({ ...form, start_date: v })} />
        {!form.is_current && (
          <Field label="End (YYYY-MM)" value={form.end_date} onChange={(v) => setForm({ ...form, end_date: v })} />
        )}
      </div>
      <label className="flex items-center gap-2 text-xs text-gray-600">
        <input type="checkbox" checked={form.is_current} onChange={(e) => setForm({ ...form, is_current: e.target.checked })} />
        Currently working here
      </label>
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
        <textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          rows={2}
          className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div className="flex gap-2">
        <button onClick={submit} className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700">
          Add
        </button>
        <button onClick={() => setOpen(false)} className="text-xs text-gray-500 hover:text-gray-700">
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Add-education form (collapsed by default)
// ─────────────────────────────────────────────────────────────

function AddEducationForm({ onAdd }: { onAdd: (data: EducationCreate) => void }) {
  const [open, setOpen] = useState(false);
  const blank = { school: "", degree: "", field_of_study: "", start_date: "", end_date: "", gpa: "" };
  const [form, setForm] = useState(blank);

  const submit = () => {
    if (!form.school) return;
    onAdd(form);
    setForm(blank);
    setOpen(false);
  };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-xs text-blue-600 hover:text-blue-800 font-medium mt-1">
        + Add Education
      </button>
    );
  }

  return (
    <div className="mt-3 space-y-2 border-t border-gray-100 pt-3">
      <div className="grid grid-cols-2 gap-2">
        <Field label="School *" value={form.school} onChange={(v) => setForm({ ...form, school: v })} />
        <Field label="Degree" value={form.degree} onChange={(v) => setForm({ ...form, degree: v })} placeholder="e.g. Bachelor" />
        <Field label="Field of Study" value={form.field_of_study} onChange={(v) => setForm({ ...form, field_of_study: v })} />
        <Field label="GPA" value={form.gpa} onChange={(v) => setForm({ ...form, gpa: v })} />
        <Field label="Start (YYYY-MM)" value={form.start_date} onChange={(v) => setForm({ ...form, start_date: v })} />
        <Field label="End (YYYY-MM)" value={form.end_date} onChange={(v) => setForm({ ...form, end_date: v })} />
      </div>
      <div className="flex gap-2">
        <button onClick={submit} className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700">
          Add
        </button>
        <button onClick={() => setOpen(false)} className="text-xs text-gray-500 hover:text-gray-700">
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Section wrapper card
// ─────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 mb-4">
      <h2 className="text-sm font-semibold text-gray-700 mb-4">{title}</h2>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Main ProfilePage component
// ─────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [workExps, setWorkExps] = useState<WorkExperience[]>([]);
  const [educations, setEducations] = useState<Education[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Local form state mirrors the profile fields
  const [form, setForm] = useState<ProfileUpdate>({});

  useEffect(() => {
    Promise.all([getProfile(), listWorkExperiences(), listEducations()]).then(
      ([p, we, edu]) => {
        setProfile(p);
        setWorkExps(we);
        setEducations(edu);
        // Pre-fill form with existing values (strip nulls to empty strings for inputs)
        setForm({
          full_name: p.full_name ?? "",
          email: p.email ?? "",
          phone: p.phone ?? "",
          address: p.address ?? "",
          nationality: p.nationality ?? "",
          visa_status: p.visa_status ?? "",
          needs_sponsor: p.needs_sponsor,
          linkedin_url: p.linkedin_url ?? "",
          github_url: p.github_url ?? "",
          portfolio_url: p.portfolio_url ?? "",
        });
      }
    );
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Strip empty strings back to undefined so the backend ignores them
      const payload: ProfileUpdate = Object.fromEntries(
        Object.entries(form).filter(([, v]) => v !== "")
      );
      const updated = await updateProfile(payload);
      setProfile(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  // Work experience handlers
  const handleAddExp = async (data: WorkExperienceCreate) => {
    const created = await createWorkExperience(data);
    setWorkExps((prev) => [...prev, created]);
  };

  const handleUpdateExp = async (id: string, data: Partial<WorkExperienceCreate>) => {
    const updated = await updateWorkExperience(id, data);
    setWorkExps((prev) => prev.map((e) => (e.id === id ? updated : e)));
  };

  const handleDeleteExp = async (id: string) => {
    await deleteWorkExperience(id);
    setWorkExps((prev) => prev.filter((e) => e.id !== id));
  };

  // Education handlers
  const handleAddEdu = async (data: EducationCreate) => {
    const created = await createEducation(data);
    setEducations((prev) => [...prev, created]);
  };

  const handleUpdateEdu = async (id: string, data: Partial<EducationCreate>) => {
    const updated = await updateEducation(id, data);
    setEducations((prev) => prev.map((e) => (e.id === id ? updated : e)));
  };

  const handleDeleteEdu = async (id: string) => {
    await deleteEducation(id);
    setEducations((prev) => prev.filter((e) => e.id !== id));
  };

  const f = (key: keyof ProfileUpdate) => ({
    value: String(form[key] ?? ""),
    onChange: (v: string) => setForm((prev) => ({ ...prev, [key]: v })),
  });

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-2xl mx-auto px-6 py-8">
          <p className="text-sm text-gray-500">Loading profile…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-2xl mx-auto px-6 py-8">

        {/* Page header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Profile</h1>
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Saving…" : saved ? "✓ Saved" : "Save Changes"}
          </button>
        </div>

        {/* ── Basic Info ── */}
        <Section title="Basic Information">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Full Name" {...f("full_name")} placeholder="Jane Doe" />
            <Field label="Email" type="email" {...f("email")} placeholder="jane@example.com" />
            <Field label="Phone" {...f("phone")} placeholder="+1-555-0100" />
            <Field label="Address" {...f("address")} placeholder="San Francisco, CA" />
          </div>
        </Section>

        {/* ── Immigration ── */}
        <Section title="Immigration Status">
          <div className="grid grid-cols-2 gap-4 mb-3">
            <Field label="Nationality" {...f("nationality")} placeholder="Taiwan" />
            <Field label="Visa Status" {...f("visa_status")} placeholder="F-1, H-1B, Green Card…" />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={!!form.needs_sponsor}
              onChange={(e) => setForm((prev) => ({ ...prev, needs_sponsor: e.target.checked }))}
              className="rounded"
            />
            I require visa sponsorship
          </label>
        </Section>

        {/* ── Links ── */}
        <Section title="Online Profiles">
          <div className="grid grid-cols-1 gap-4">
            <Field label="LinkedIn URL" {...f("linkedin_url")} placeholder="https://linkedin.com/in/…" />
            <Field label="GitHub URL" {...f("github_url")} placeholder="https://github.com/…" />
            <Field label="Portfolio URL" {...f("portfolio_url")} placeholder="https://yoursite.com" />
          </div>
        </Section>

        {/* ── Work Experience ── */}
        <Section title="Work Experience">
          {workExps.length === 0 && (
            <p className="text-sm text-gray-400 mb-2">No work experience added yet.</p>
          )}
          {workExps.map((exp) => (
            <WorkExpRow
              key={exp.id}
              exp={exp}
              onUpdate={handleUpdateExp}
              onDelete={handleDeleteExp}
            />
          ))}
          <AddWorkExpForm onAdd={handleAddExp} />
        </Section>

        {/* ── Education ── */}
        <Section title="Education">
          {educations.length === 0 && (
            <p className="text-sm text-gray-400 mb-2">No education added yet.</p>
          )}
          {educations.map((edu) => (
            <EducationRow
              key={edu.id}
              edu={edu}
              onUpdate={handleUpdateEdu}
              onDelete={handleDeleteEdu}
            />
          ))}
          <AddEducationForm onAdd={handleAddEdu} />
        </Section>

        {/* AI-extracted skills (read-only, populated from resume parsing) */}
        {profile.skills && profile.skills.length > 0 && (
          <Section title="Skills (extracted from resume)">
            <div className="flex flex-wrap gap-2">
              {profile.skills.map((skill) => (
                <span
                  key={skill}
                  className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded"
                >
                  {skill}
                </span>
              ))}
            </div>
          </Section>
        )}
      </div>
    </div>
  );
}

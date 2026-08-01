"use client";
import * as React from "react";
import {
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ImageUploader } from "./image-uploader";
const empty = {
  projectTitle: "",
  description: "",
  coverImageUrl: null as string | null,
  projectImages: [] as string[],
  skillsUsed: [] as string[],
  category: "",
  clientName: "",
  completionDate: "",
  projectUrl: "",
  externalUrl: "",
  displayOrder: 0,
  isVisible: true,
};
export function PortfolioEditor({
  projects,
  onRefresh,
}: {
  projects: any[];
  onRefresh: () => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState<any>(empty);
  const [message, setMessage] = React.useState("");
  const save = async () => {
    const response = await fetch("/api/freelancer/portfolio", {
      method: form.id ? "PUT" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await response.json();
    if (!response.ok) return setMessage(data.error);
    setOpen(false);
    setForm(empty);
    onRefresh();
  };
  const update = async (project: any, changes: any) => {
    await fetch("/api/freelancer/portfolio", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...project,
        projectTitle: project.project_title || project.projectTitle,
        coverImageUrl: project.cover_image_url || project.coverImageUrl,
        projectImages: project.project_images || project.projectImages || [],
        skillsUsed: project.skills_used || project.skillsUsed,
        clientName: project.client_name || project.clientName,
        completionDate: project.completion_date || project.completionDate,
        projectUrl: project.project_url || project.projectUrl,
        externalUrl: project.external_url || project.externalUrl,
        displayOrder: project.display_order ?? project.displayOrder,
        isVisible: project.is_visible ?? project.isVisible,
        ...changes,
      }),
    });
    onRefresh();
  };
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Portfolio projects</h2>
          <p className="text-sm text-muted-foreground">
            Add, edit, hide and reorder your best work.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setForm(empty)}>
              <Plus className="mr-2 h-4 w-4" />
              Add project
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {form.id ? "Edit" : "Add"} portfolio project
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <ImageUploader
                label="Project cover"
                value={form.coverImageUrl}
                kind="portfolio"
                aspect={16 / 9}
                onChange={(url) => setForm({ ...form, coverImageUrl: url })}
              />
              <GalleryUploader
                images={form.projectImages || []}
                onChange={(projectImages) =>
                  setForm({ ...form, projectImages })
                }
              />
              <div>
                <Label>Project title</Label>
                <Input
                  value={form.projectTitle}
                  onChange={(e) =>
                    setForm({ ...form, projectTitle: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  rows={5}
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Category</Label>
                  <Input
                    value={form.category}
                    onChange={(e) =>
                      setForm({ ...form, category: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>Client/company (optional)</Label>
                  <Input
                    value={form.clientName}
                    onChange={(e) =>
                      setForm({ ...form, clientName: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>Completion date</Label>
                  <Input
                    type="date"
                    value={form.completionDate || ""}
                    onChange={(e) =>
                      setForm({ ...form, completionDate: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>Skills used (comma separated)</Label>
                  <Input
                    value={(form.skillsUsed || []).join(", ")}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        skillsUsed: e.target.value
                          .split(",")
                          .map((v) => v.trim())
                          .filter(Boolean),
                      })
                    }
                  />
                </div>
                <div>
                  <Label>Live project URL</Label>
                  <Input
                    type="url"
                    value={form.projectUrl || ""}
                    onChange={(e) =>
                      setForm({ ...form, projectUrl: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>External portfolio URL</Label>
                  <Input
                    type="url"
                    value={form.externalUrl || ""}
                    onChange={(e) =>
                      setForm({ ...form, externalUrl: e.target.value })
                    }
                  />
                </div>
              </div>
              {message && <p className="text-sm text-red-600">{message}</p>}
              <Button onClick={save}>Save project</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      {projects.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
          No portfolio projects yet.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {projects.map((project, index) => (
            <Card key={project.id}>
              <CardContent className="p-4">
                {(project.cover_image_url || project.coverImageUrl) && (
                  <img
                    src={project.cover_image_url || project.coverImageUrl}
                    alt=""
                    className="mb-3 aspect-video w-full rounded-lg object-cover"
                  />
                )}
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">
                      {project.project_title || project.projectTitle}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {project.category}
                    </p>
                  </div>
                  {(project.is_visible ?? project.isVisible) ? (
                    <Eye className="h-4 w-4" />
                  ) : (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <div className="mt-3 flex flex-wrap gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Edit"
                    onClick={() => {
                      setForm({
                        ...project,
                        projectTitle: project.project_title,
                        coverImageUrl: project.cover_image_url,
                        projectImages: project.project_images || [],
                        skillsUsed: project.skills_used || [],
                        clientName: project.client_name || "",
                        completionDate: project.completion_date || "",
                        projectUrl: project.project_url || "",
                        externalUrl: project.external_url || "",
                        displayOrder: project.display_order,
                        isVisible: project.is_visible,
                      });
                      setOpen(true);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Toggle visibility"
                    onClick={() =>
                      update(project, {
                        isVisible: !(project.is_visible ?? project.isVisible),
                      })
                    }
                  >
                    {(project.is_visible ?? project.isVisible) ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    disabled={index === 0}
                    aria-label="Move up"
                    onClick={() =>
                      update(project, {
                        displayOrder: Math.max(
                          0,
                          (project.display_order || 0) - 1,
                        ),
                      })
                    }
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    disabled={index === projects.length - 1}
                    aria-label="Move down"
                    onClick={() =>
                      update(project, {
                        displayOrder: (project.display_order || 0) + 1,
                      })
                    }
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Delete"
                    onClick={async () => {
                      if (!confirm("Delete this project?")) return;
                      await fetch(
                        `/api/freelancer/portfolio?id=${project.id}`,
                        { method: "DELETE" },
                      );
                      onRefresh();
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function GalleryUploader({
  images,
  onChange,
}: {
  images: string[];
  onChange: (images: string[]) => void;
}) {
  const [adding, setAdding] = React.useState(false);
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <Label>Additional project images</Label>
          <p className="text-xs text-muted-foreground">
            Add up to eight supporting screenshots or images.
          </p>
        </div>
        {images.length < 8 && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setAdding(true)}
          >
            <Plus className="mr-2 h-4 w-4" /> Add image
          </Button>
        )}
      </div>
      {adding && (
        <ImageUploader
          label="New gallery image"
          value={null}
          kind="portfolio-gallery"
          aspect={16 / 9}
          onChange={(url) => {
            if (url) onChange([...images, url]);
            setAdding(false);
          }}
        />
      )}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {images.map((image) => (
          <div key={image} className="group relative">
            <img
              src={image}
              alt="Project gallery"
              className="aspect-video w-full rounded-lg object-cover"
            />
            <Button
              type="button"
              size="icon"
              variant="destructive"
              className="absolute right-1 top-1 h-7 w-7"
              onClick={() => onChange(images.filter((item) => item !== image))}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
